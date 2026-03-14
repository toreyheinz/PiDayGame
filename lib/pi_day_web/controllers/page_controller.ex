defmodule PiDayWeb.PageController do
  use PiDayWeb, :controller

  alias PiDay.Game
  alias PiDay.Game.Player

  def home(conn, _params) do
    # If player already has a session, redirect to play
    token = get_session(conn, :player_token)

    if token && Game.get_player_by_token(token) do
      redirect(conn, to: ~p"/play")
    else
      render(conn, :home, avatars: Player.avatars())
    end
  end

  def join(conn, %{"player" => player_params}) do
    case Game.create_player(player_params) do
      {:ok, player} ->
        conn
        |> put_session(:player_token, player.session_token)
        |> redirect(to: ~p"/play")

      {:error, _changeset} ->
        conn
        |> put_flash(:error, "Could not join. Pick a name and avatar!")
        |> redirect(to: ~p"/")
    end
  end
end
