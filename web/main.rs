use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder, ResponseError, http::StatusCode, middleware::Logger};
use serde::{Deserialize, Serialize};
use actix_web::dev::{ServiceRequest, ServiceResponse};
use actix_web::middleware::{NormalizePath, ErrorHandlers};
use actix_web::error::JsonPayloadError;
use thiserror::Error;
use chrono::Utc;
use uuid::Uuid;
use env_logger::Env; 

#[derive(Serialize, Deserialize)]
struct EchoRequest { message: String }

#[derive(Serialize, Deserialize)]
struct ApiResponse<T> {
    status: String,
    timestamp: String,
    request_id: String,
    data: Option<T>,
    error: Option<String>,
}

#[derive(Debug, Error)]
enum ApiError {
    #[error("Invalid JSON: {0}")]
    JsonError(String),
    #[error("Internal server error")]
    InternalError,
}

impl ResponseError for ApiError {
    fn status_code(&self) -> StatusCode {
        match self {
            ApiError::JsonError(_) => StatusCode::BAD_REQUEST,
            ApiError::InternalError => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        let body = ApiResponse::<()> {
            status: "error".to_string(),
            timestamp: Utc::now().to_rfc3339(),
            request_id: Uuid::new_v4().to_string(),
            data: None,
            error: Some(self.to_string()),
        };
        HttpResponse::build(self.status_code()).json(body)
    }
}

async fn add_request_id(req: ServiceRequest, srv: actix_web::dev::Service<ServiceRequest>) -> Result<ServiceResponse, actix_web::Error> {
    let request_id = Uuid::new_v4().to_string();
    req.extensions_mut().insert(request_id.clone());
    let mut res = srv.call(req).await?;
    res.response_mut().headers_mut().insert("X-Request-ID", request_id.parse().unwrap());
    Ok(res)
}

#[get("/")]
async fn hello(req: web::HttpRequest) -> impl Responder {
    let request_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let body = ApiResponse { status: "success".into(), timestamp: Utc::now().to_rfc3339(), request_id, data: Some(EchoRequest { message: "Hello world!".into() }), error: None };
    HttpResponse::Ok().json(body)
}

#[post("/echo")]
async fn echo(req_body: Result<web::Json<EchoRequest>, JsonPayloadError>, req: web::HttpRequest) -> Result<impl Responder, ApiError> {
    let request_id = req.extensions().get::<String>().cloned().unwrap_or_else(|| Uuid::new_v4().to_string());
    match req_body {
        Ok(json) => Ok(HttpResponse::Ok().json(ApiResponse {
            status: "success".into(),
            timestamp: Utc::now().to_rfc3339(),
            request_id,
            data: Some(EchoRequest { message: json.message.clone() }),
            error: None,
        })),
        Err(e) => Err(ApiError::JsonError(e.to_string())),
    }
}

async fn manual_hello(req: web::HttpRequest) -> impl Responder {
    let request_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    HttpResponse::Ok().json(ApiResponse { status: "success".into(), timestamp: Utc::now().to_rfc3339(), request_id, data: Some(EchoRequest { message: "Hey there!".into() }), error: None })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();
    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port: u16 = std::env::var("SERVER_PORT").unwrap_or_else(|_| "8080".into()).parse().unwrap();

    HttpServer::new(|| {
        App::new()
            .wrap(NormalizePath::trim())
            .wrap(Logger::default())
            .wrap(ErrorHandlers::new())
            .wrap_fn(add_request_id)
            .service(hello)
            .service(echo)
            .route("/hey", web::get().to(manual_hello))
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
