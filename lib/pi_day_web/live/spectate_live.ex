defmodule PiDayWeb.SpectateLive do
  use PiDayWeb, :live_view

  alias PiDay.Game

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(PiDay.PubSub, "leaderboard")
      :timer.send_interval(5000, self(), :refresh_leaderboard)
    end

    {:ok,
     assign(socket,
       page_title: "Pi Station - Leaderboard",
       leaderboard: Game.leaderboard(),
       pi_top: Game.top_scores("pi_memory", 5),
       mc_top: Game.top_scores("monte_carlo", 5),
       slice_top: Game.top_scores("slice_the_pi", 5)
     )}
  end

  @impl true
  def handle_info(:refresh_leaderboard, socket) do
    {:noreply,
     assign(socket,
       leaderboard: Game.leaderboard(),
       pi_top: Game.top_scores("pi_memory", 5),
       mc_top: Game.top_scores("monte_carlo", 5),
       slice_top: Game.top_scores("slice_the_pi", 5)
     )}
  end

  def handle_info({:score_updated, _score}, socket) do
    {:noreply,
     assign(socket,
       leaderboard: Game.leaderboard(),
       pi_top: Game.top_scores("pi_memory", 5),
       mc_top: Game.top_scores("monte_carlo", 5),
       slice_top: Game.top_scores("slice_the_pi", 5)
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black text-white p-6">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
            &pi; Station
          </div>
          <p class="text-purple-300 text-xl">Pi Day 2026 &middot; Live Leaderboard</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Overall Leaderboard -->
          <div class="lg:col-span-2 bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
            <h2 class="text-2xl font-bold text-cyan-400 mb-4">Overall Rankings</h2>
            <div class="space-y-2">
              <%= for {player, idx} <- Enum.with_index(@leaderboard) do %>
                <div class={"flex items-center gap-4 p-3 rounded-xl #{if idx < 3, do: "bg-gradient-to-r from-yellow-500/10 to-transparent", else: "bg-white/5"}"}>
                  <div class={"text-2xl font-bold w-10 text-center #{rank_color(idx)}"}>
                    #{idx + 1}
                  </div>
                  <div class="text-2xl"><%= avatar_symbol(player.avatar_key) %></div>
                  <div class="flex-1 text-lg font-medium"><%= player.name %></div>
                  <div class="text-2xl font-bold text-cyan-400"><%= player.total_score %></div>
                </div>
              <% end %>
              <%= if @leaderboard == [] do %>
                <p class="text-purple-400 text-center py-8">No scores yet — join the game!</p>
              <% end %>
            </div>
          </div>

          <!-- Mini-game leaderboards -->
          <.mini_leaderboard title="Pi Memory Sprint" icon="🧠" scores={@pi_top} />
          <.mini_leaderboard title="Monte Carlo Pi" icon="🎯" scores={@mc_top} />
          <.mini_leaderboard title="Slice the Pi" icon="🔪" scores={@slice_top} />
        </div>

        <div class="text-center mt-8 text-purple-400/50 text-sm font-mono">
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

  defp avatar_symbol(key) do
    PiDayWeb.PageHTML.avatar_symbol(key)
  end

  attr :title, :string, required: true
  attr :icon, :string, required: true
  attr :scores, :list, required: true

  defp mini_leaderboard(assigns) do
    ~H"""
    <div class="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
      <h3 class="text-xl font-bold text-purple-300 mb-3"><%= @icon %> <%= @title %></h3>
      <div class="space-y-2">
        <%= for {score, idx} <- Enum.with_index(@scores) do %>
          <div class="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
            <span class="text-purple-400 font-bold w-6"><%= idx + 1 %>.</span>
            <span class="flex-1"><%= score.player.name %></span>
            <span class="text-cyan-400 font-bold"><%= score.score %></span>
          </div>
        <% end %>
        <%= if @scores == [] do %>
          <p class="text-purple-400/50 text-center py-4 text-sm">No scores yet</p>
        <% end %>
      </div>
    </div>
    """
  end
end
