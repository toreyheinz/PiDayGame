defmodule PiDay.Game.Player do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "players" do
    field :name, :string
    field :avatar_key, :string
    field :session_token, :string
    field :total_score, :integer, default: 0

    has_many :game_scores, PiDay.Game.Score

    timestamps(type: :utc_datetime)
  end

  @avatars ~w(pi sigma delta omega theta lambda phi psi epsilon zeta)

  def avatars, do: @avatars

  def changeset(player, attrs) do
    player
    |> cast(attrs, [:name, :avatar_key])
    |> validate_required([:name, :avatar_key])
    |> validate_length(:name, min: 1, max: 20)
    |> validate_inclusion(:avatar_key, @avatars)
    |> put_session_token()
  end

  defp put_session_token(changeset) do
    if get_field(changeset, :session_token) do
      changeset
    else
      put_change(changeset, :session_token, generate_token())
    end
  end

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end
end
