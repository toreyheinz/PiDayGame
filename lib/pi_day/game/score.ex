defmodule PiDay.Game.Score do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "game_scores" do
    field :game_type, :string
    field :score, :integer, default: 0
    field :metadata, :map, default: %{}

    belongs_to :player, PiDay.Game.Player

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @game_types ~w(pi_memory monte_carlo slice_the_pi pi_trivia projectile_pi)

  def changeset(score, attrs) do
    score
    |> cast(attrs, [:player_id, :game_type, :score, :metadata])
    |> validate_required([:player_id, :game_type, :score])
    |> validate_inclusion(:game_type, @game_types)
    |> foreign_key_constraint(:player_id)
  end
end
