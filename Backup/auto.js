setInterval(() => {
  fs.writeFileSync(
    path.join(app.getPath("userData"), "web4_memory_backup.json"),
    JSON.stringify(memory, null, 2)
  )
}, 10000)
