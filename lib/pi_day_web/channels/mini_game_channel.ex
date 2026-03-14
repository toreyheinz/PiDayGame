defmodule PiDayWeb.MiniGameChannel do
  use PiDayWeb, :channel

  alias PiDay.Game

  @impl true
  def join("game:mini:" <> game_type, _payload, socket) when game_type in ~w(pi_memory monte_carlo slice_the_pi) do
    socket = assign(socket, :game_type, game_type)
    {:ok, socket}
  end

  def join(_, _, _), do: {:error, %{reason: "invalid game"}}

  # --- Pi Memory Sprint ---

  @impl true
  def handle_in("pi_check_digit", %{"position" => pos, "digit" => digit}, socket) do
    correct = Game.check_pi_digit(pos, digit)

    if correct do
      broadcast!(socket, "pi_progress", %{
        player_id: socket.assigns.player.id,
        name: socket.assigns.player.name,
        position: pos + 1
      })
    end

    {:reply, {:ok, %{correct: correct}}, socket}
  end

  def handle_in("pi_game_over", %{"score" => score}, socket) do
    player = socket.assigns.player

    Game.record_score(%{
      player_id: player.id,
      game_type: "pi_memory",
      score: score,
      metadata: %{digits: score}
    })

    broadcast!(socket, "pi_score", %{
      player_id: player.id,
      name: player.name,
      score: score
    })

    {:reply, {:ok, %{recorded: true}}, socket}
  end

  # --- Monte Carlo Pi ---

  def handle_in("mc_submit", %{"estimate" => estimate, "darts" => darts}, socket) do
    player = socket.assigns.player
    error = abs(estimate - :math.pi())
    score = max(0, round(1000 - error * 1000))

    Game.record_score(%{
      player_id: player.id,
      game_type: "monte_carlo",
      score: score,
      metadata: %{estimate: estimate, darts: darts, error: Float.round(error, 6)}
    })

    broadcast!(socket, "mc_result", %{
      player_id: player.id,
      name: player.name,
      estimate: estimate,
      score: score
    })

    {:reply, {:ok, %{score: score, error: Float.round(error, 6)}}, socket}
  end

  # --- Slice the Pi (speed math) ---

  def handle_in("slice_get_problem", _payload, socket) do
    problem = Game.generate_math_problem()
    {:reply, {:ok, problem}, socket}
  end

  def handle_in("slice_answer", %{"correct" => correct, "time_ms" => time_ms, "streak" => streak}, socket) do
    player = socket.assigns.player
    points = if correct, do: max(10, 100 - div(time_ms, 100)) + streak * 10, else: 0

    if correct do
      broadcast!(socket, "slice_correct", %{
        player_id: player.id,
        name: player.name,
        streak: streak
      })
    end

    {:reply, {:ok, %{points: points}}, socket}
  end

  def handle_in("slice_game_over", %{"score" => score, "correct" => correct, "total" => total}, socket) do
    player = socket.assigns.player

    Game.record_score(%{
      player_id: player.id,
      game_type: "slice_the_pi",
      score: score,
      metadata: %{correct: correct, total: total}
    })

    broadcast!(socket, "slice_score", %{
      player_id: player.id,
      name: player.name,
      score: score
    })

    {:reply, {:ok, %{recorded: true}}, socket}
  end
end
