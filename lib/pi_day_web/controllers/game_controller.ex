defmodule PiDayWeb.GameController do
  use PiDayWeb, :controller

  @url_to_game %{
    "/projectile-pi" => "projectile_pi",
    "/pi-memory" => "pi_memory",
    "/monte-carlo" => "monte_carlo",
    "/slice-the-pi" => "slice_the_pi",
    "/pi-trivia" => "pi_trivia"
  }

  def play(conn, _params) do
    player = conn.assigns.current_player

    conn
    |> put_layout(false)
    |> render(:play, player: player, auto_open_game: nil)
  end

  def game(conn, _params) do
    player = conn.assigns.current_player
    game_type = @url_to_game[conn.request_path]

    conn
    |> put_layout(false)
    |> render(:play, player: player, auto_open_game: game_type)
  end
end
