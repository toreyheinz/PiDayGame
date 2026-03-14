defmodule Deploy.SSH do
  @moduledoc """
  Shared SSH utilities for deployment mix tasks.

  Provides ssh_exec/2, scp_upload/3, and get_deploy_config/1
  used by Mix.Tasks.Deploy, Deploy.Service, and Deploy.Nginx.
  """

  require Logger

  @doc """
  Load and merge deployment config for the given environment.
  Returns a map with all config keys merged from base + env.
  """
  def get_deploy_config(env) do
    base_config = Application.get_all_env(:deploy)
    env_config = Keyword.get(base_config, env, [])

    if env_config == [] do
      Logger.error("No configuration found for environment: #{env}")
      exit(1)
    end

    app_name = Keyword.get(base_config, :app_name) || (Mix.Project.config()[:app] |> to_string())

    base_config
    |> Keyword.delete(:production)
    |> Keyword.delete(:staging)
    |> Keyword.merge(env_config)
    |> Keyword.put(:env, env)
    |> Keyword.put(:app_name, app_name)
    |> Map.new()
  end

  @doc """
  Execute a command on the remote server via SSH.
  Returns {output, exit_code}.
  """
  def ssh_exec(config, command) do
    port_opt = if config.port && config.port != 22, do: "-p #{config.port}", else: ""

    ssh_command = """
    ssh -T -A -o ConnectTimeout=10 #{port_opt} \
    #{config.user}@#{config.domain} '#{command}'
    """

    Logger.debug("SSH command: #{inspect(ssh_command)}")
    Logger.debug("Remote command: #{inspect(command)}")

    System.cmd("bash", ["-c", ssh_command], stderr_to_stdout: true)
  end

  @doc """
  Upload a local file to the remote server via SCP.
  Returns {output, exit_code}.
  """
  def scp_upload(config, local_file, remote_file) do
    port_opt = if config.port && config.port != 22, do: "-P #{config.port}", else: ""

    scp_command = """
    scp #{port_opt} #{local_file} \
    #{config.user}@#{config.domain}:#{remote_file}
    """

    System.cmd("bash", ["-c", scp_command], stderr_to_stdout: true)
  end
end
