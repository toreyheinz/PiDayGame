defmodule PiDayWeb.UserSocket do
  use Phoenix.Socket

  channel "game:hub", PiDayWeb.GameChannel
  channel "game:mini:*", PiDayWeb.MiniGameChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case PiDay.Game.get_player_by_token(token) do
      nil -> :error
      player -> {:ok, assign(socket, :player, player)}
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.player.id}"
end
