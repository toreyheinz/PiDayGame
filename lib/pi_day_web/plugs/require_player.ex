defmodule PiDayWeb.Plugs.RequirePlayer do
  import Plug.Conn
  import Phoenix.Controller

  def init(opts), do: opts

  def call(conn, _opts) do
    token = get_session(conn, :player_token)

    if token do
      case PiDay.Game.get_player_by_token(token) do
        nil ->
          conn |> redirect(to: "/") |> halt()

        player ->
          assign(conn, :current_player, player)
      end
    else
      conn |> redirect(to: "/") |> halt()
    end
  end
end
