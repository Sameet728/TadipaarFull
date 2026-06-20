module.exports = {
  apps: [{
    name: "tadipaar-api",
    script: "./server.js",
    instances: "max", // Utilizes all available CPU cores
    exec_mode: "cluster", // Enables clustering
    env: {
      NODE_ENV: "production",
      PORT: 5000
    },
    log_date_format: "YYYY-MM-DD HH:mm Z",
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    merge_logs: true,
    time: true,
    // Max memory restart helps prevent hidden leaks from killing the whole server
    max_memory_restart: "500M"
  }]
}
