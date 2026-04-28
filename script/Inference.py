import asyncio
import torch
import queue
import threading
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from fastapi import FastAPI, WebSocket
from fastapi.responses import StreamingResponse


# -----------------------
# LOGGING
# -----------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("web4")


# -----------------------
# WEB4 IDENTITY LAYER
# -----------------------

class IdentityRouter:
    def route(self, identity: str, model: str):
        # Web4 principle: routing is context-aware
        return model  # can evolve into smart routing later


# -----------------------
# MODEL LAYER
# -----------------------

class Web4Model(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.net = torch.nn.Identity()

    def forward(self, x):
        return self.net(x)


@dataclass
class ModelNode:
    name: str
    model: torch.nn.Module
    adapters: Optional[List[str]] = None


# -----------------------
# SWARM REGISTRY (Web4 Core)
# -----------------------

class SwarmRegistry:
    def __init__(self):
        self.nodes: Dict[str, ModelNode] = {}

    def register(self, name: str):
        model = Web4Model().cuda() if torch.cuda.is_available() else Web4Model()
        model.eval()

        self.nodes[name] = ModelNode(name=name, model=model)
        logger.info(f"Node registered: {name}")

    def get(self, name: str):
        return self.nodes[name].model


# -----------------------
# CONTINUOUS BATCH ENGINE
# -----------------------

class SwarmBatchEngine:
    def __init__(self, registry: SwarmRegistry, batch_size=8):
        self.registry = registry
        self.queue = queue.Queue()
        self.batch_size = batch_size

    def submit(self, model: str, data: Any):
        result_q = queue.Queue()
        self.queue.put((model, data, result_q))
        return result_q

    def start(self):
        threading.Thread(target=self.loop, daemon=True).start()

    def loop(self):
        while True:
            batch = []

            try:
                batch.append(self.queue.get(timeout=0.05))
            except:
                continue

            while len(batch) < self.batch_size and not self.queue.empty():
                batch.append(self.queue.get())

            self.execute(batch)

    def execute(self, batch):
        grouped = {}

        for model, data, q in batch:
            grouped.setdefault(model, []).append((data, q))

        for model_name, items in grouped.items():
            model = self.registry.get(model_name)

            inputs, queues = [], []

            for data, q in items:
                inputs.append(data)
                queues.append(q)

            if torch.is_tensor(inputs[0]):
                x = torch.stack(inputs)
                out = model(x)
                outputs = out
            else:
                outputs = [model(x) for x in inputs]

            for o, q in zip(outputs, queues):
                q.put(o)


# -----------------------
# STREAMING ENGINE (Web4 native)
# -----------------------

class StreamEngine:
    def stream(self, output):
        text = str(output)
        for t in text:
            yield t


# -----------------------
# WEB4 RUNTIME
# -----------------------

class Web4Runtime:
    def __init__(self):
        self.identity = IdentityRouter()
        self.registry = SwarmRegistry()
        self.batch = SwarmBatchEngine(self.registry)
        self.stream = StreamEngine()

        # bootstrap nodes
        self.registry.register("default")
        self.registry.register("kubu-node")

        self.batch.start()

    async def predict(self, identity: str, model: str, data):
        model = self.identity.route(identity, model)
        q = self.batch.submit(model, data)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, q.get)

    def stream_output(self, identity: str, model: str, data):
        model = self.identity.route(identity, model)
        q = self.batch.submit(model, data)
        output = q.get()
        return self.stream.stream(output)


# -----------------------
# BOOT WEB4 API
# -----------------------

app = FastAPI()
runtime = Web4Runtime()


@app.post("/web4/predict")
async def predict(payload: dict):
    identity = payload.get("identity", "anon")
    model = payload.get("model", "default")
    data = torch.tensor(payload["data"]) if isinstance(payload["data"], list) else payload["data"]

    result = await runtime.predict(identity, model, data)
    return {"output": str(result)}


@app.post("/web4/stream")
async def stream(payload: dict):
    identity = payload.get("identity", "anon")
    model = payload.get("model", "default")
    data = payload.get("data")

    def generator():
        for token in runtime.stream_output(identity, model, data):
            yield token

    return StreamingResponse(generator(), media_type="text/plain")


@app.websocket("/web4/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    while True:
        msg = await ws.receive_json()

        result = await runtime.predict(
            msg.get("identity", "anon"),
            msg.get("model", "default"),
            torch.tensor(msg["data"]) if isinstance(msg["data"], list) else msg["data"]
        )

        await ws.send_text(str(result))
