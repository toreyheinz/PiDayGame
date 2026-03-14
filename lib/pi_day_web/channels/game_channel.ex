defmodule PiDayWeb.GameChannel do
  use PiDayWeb, :channel

  alias PiDayWeb.Presence

  @impl true
  def join("game:hub", _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    player = socket.assigns.player

    {:ok, _} =
      Presence.track(socket, player.id, %{
        name: player.name,
        avatar_key: player.avatar_key,
        x: 400,
        y: 300,
        score: player.total_score,
        status: "hub"
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("move", %{"x" => x, "y" => y}, socket) do
    player = socket.assigns.player

    Presence.update(socket, player.id, fn meta ->
      %{meta | x: x, y: y}
    end)

    {:noreply, socket}
  end

  def handle_in("chat", %{"message" => message}, socket) do
    player = socket.assigns.player
    broadcast!(socket, "chat", %{player_id: player.id, name: player.name, message: String.slice(message, 0, 100)})
    {:noreply, socket}
  end

  def handle_in("enter_game", %{"game" => game_type}, socket) do
    player = socket.assigns.player

    Presence.update(socket, player.id, fn meta ->
      %{meta | status: game_type}
    end)

    {:noreply, socket}
  end

  def handle_in("leave_game", _payload, socket) do
    player = socket.assigns.player

    Presence.update(socket, player.id, fn meta ->
      %{meta | status: "hub"}
    end)

    {:noreply, socket}
  end
end
