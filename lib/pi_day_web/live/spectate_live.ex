defmodule PiDayWeb.SpectateLive do
  use PiDayWeb, :live_view

  alias PiDay.Game
  alias PiDayWeb.Presence

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(PiDay.PubSub, "leaderboard")
      # Subscribe to presence diffs for the hub
      PiDayWeb.Endpoint.subscribe("game:hub")
      :timer.send_interval(3000, self(), :refresh_leaderboard)
      :timer.send_interval(200, self(), :push_presence)
    end

    {:ok,
     assign(socket,
       page_title: "Pi Station - Leaderboard",
       leaderboard: Game.leaderboard(),
       pi_top: Game.top_scores("pi_memory", 5),
       mc_top: Game.top_scores("monte_carlo", 5),
       slice_top: Game.top_scores("slice_the_pi", 5),
       trivia_top: Game.top_scores("pi_trivia", 5),
       projectile_top: Game.top_scores("projectile_pi", 5)
     )}
  end

  defp refresh(socket) do
    assign(socket,
      leaderboard: Game.leaderboard(),
      pi_top: Game.top_scores("pi_memory", 5),
      mc_top: Game.top_scores("monte_carlo", 5),
      slice_top: Game.top_scores("slice_the_pi", 5),
      trivia_top: Game.top_scores("pi_trivia", 5),
      projectile_top: Game.top_scores("projectile_pi", 5)
    )
  end

  @impl true
  def handle_info(:refresh_leaderboard, socket) do
    {:noreply, refresh(socket)}
  end

  def handle_info(:push_presence, socket) do
    players =
      Presence.list("game:hub")
      |> Enum.map(fn {id, %{metas: [meta | _]}} ->
        %{id: id, name: meta.name, avatar_key: meta.avatar_key, x: meta.x, y: meta.y, status: meta.status}
      end)

    {:noreply, push_event(socket, "hub_players", %{players: players})}
  end

  def handle_info({:score_updated, _score}, socket) do
    {:noreply, refresh(socket)}
  end

  # Ignore presence diffs — we poll with push_presence instead
  def handle_info(%Phoenix.Socket.Broadcast{}, socket), do: {:noreply, socket}

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-4 lg:p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-1">
            &pi; Station
          </div>
          <p class="text-purple-300 text-lg">Pi Day 2026 &middot; Live Leaderboard</p>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <!-- Live Hub View -->
          <div class="xl:col-span-2 bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
            <h2 class="text-xl font-bold text-cyan-400 mb-3">Live Hub</h2>
            <div id="spectate-hub" phx-hook="SpectateHub" class="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#0a0a2e]">
              <canvas id="spectate-canvas" class="w-full h-full block"></canvas>
            </div>
          </div>

          <!-- Overall Leaderboard -->
          <div class="bg-white/5 backdrop-blur rounded-2xl p-4 lg:p-6 border border-white/10">
            <h2 class="text-xl font-bold text-cyan-400 mb-3">Rankings</h2>
            <div class="space-y-2">
              <%= for {player, idx} <- Enum.with_index(@leaderboard) do %>
                <div class={"flex items-center gap-3 p-2 rounded-xl #{if idx < 3, do: "bg-gradient-to-r from-yellow-500/10 to-transparent", else: "bg-white/5"}"}>
                  <div class={"text-xl font-bold w-8 text-center #{rank_color(idx)}"}>
                    #{idx + 1}
                  </div>
                  <div class="text-xl"><%= avatar_symbol(player.avatar_key) %></div>
                  <div class="flex-1 font-medium truncate"><%= player.name %></div>
                  <div class="text-xl font-bold text-cyan-400"><%= player.total_score %></div>
                </div>
              <% end %>
              <%= if @leaderboard == [] do %>
                <p class="text-purple-400 text-center py-6">No scores yet — join the game!</p>
              <% end %>
            </div>
          </div>
        </div>

        <!-- Mini-game leaderboards -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
          <.mini_leaderboard title="Pi Memory" icon="🧠" scores={@pi_top} />
          <.mini_leaderboard title="Monte Carlo" icon="🎯" scores={@mc_top} />
          <.mini_leaderboard title="Slice the Pi" icon="🔪" scores={@slice_top} />
          <.mini_leaderboard title="Pi Trivia" icon="💡" scores={@trivia_top} />
          <.mini_leaderboard title="Projectile Pi" icon="🚀" scores={@projectile_top} />
        </div>

        <div class="text-center mt-6 text-purple-400/50 text-sm font-mono">
          3.14159265358979323846264338327950288419716939937510...
        </div>
      </div>
    </div>
    """
  end

  defp rank_color(0), do: "text-yellow-400"
  defp rank_color(1), do: "text-gray-300"
  defp rank_color(2), do: "text-amber-600"
  defp rank_color(_), do: "text-purple-400"

  defp avatar_symbol(key), do: PiDayWeb.PageHTML.avatar_symbol(key)

  attr :title, :string, required: true
  attr :icon, :string, required: true
  attr :scores, :list, required: true

  defp mini_leaderboard(assigns) do
    ~H"""
    <div class="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
      <h3 class="text-lg font-bold text-purple-300 mb-2"><%= @icon %> <%= @title %></h3>
      <div class="space-y-1">
        <%= for {score, idx} <- Enum.with_index(@scores) do %>
          <div class="flex items-center gap-2 p-2 bg-white/5 rounded-lg text-sm">
            <span class="text-purple-400 font-bold w-5"><%= idx + 1 %>.</span>
            <span class="flex-1 truncate"><%= score.player.name %></span>
            <span class="text-cyan-400 font-bold"><%= score.score %></span>
          </div>
        <% end %>
        <%= if @scores == [] do %>
          <p class="text-purple-400/50 text-center py-3 text-sm">No scores yet</p>
        <% end %>
      </div>
    </div>
    """
  end
end
