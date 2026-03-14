import Config

# Deployment configuration for Mix.Tasks.Deploy
# See: lib/mix/tasks/deploy.ex

# Shared configuration across all environments
config :deploy,
  repository: "git@github.com:toreyheinz/PiDayGame.git",
  shared_dirs: ["tmp", "logs"],
  shared_files: [".env"],
  build_script: "./build.sh",
  app_name: "pi_day"

# Production environment configuration
config :deploy, :production,
  branch: "main",
  user: "dev",
  domain: "ssh.teagles.io",
  port: 22,
  deploy_to: "/var/www/piday.teagles.io",
  url: "https://piday.teagles.io",
  app_port: 4010

