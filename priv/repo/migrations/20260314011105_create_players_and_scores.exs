defmodule PiDay.Repo.Migrations.CreatePlayersAndScores do
  use Ecto.Migration

  def change do
    create table(:players, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :avatar_key, :string, null: false
      add :session_token, :string, null: false
      add :total_score, :integer, default: 0, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:players, [:session_token])

    create table(:game_scores, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :player_id, references(:players, type: :binary_id, on_delete: :delete_all), null: false
      add :game_type, :string, null: false
      add :score, :integer, null: false, default: 0
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:game_scores, [:player_id])
    create index(:game_scores, [:game_type])
  end
end
