defmodule PiDayWeb.GameController do
  use PiDayWeb, :controller

  def play(conn, _params) do
    player = conn.assigns.current_player

    conn
    |> put_layout(false)
    |> render(:play, player: player)
  end
end
