defmodule PiDay.Repo do
  use Ecto.Repo,
    otp_app: :pi_day,
    adapter: Ecto.Adapters.Postgres
end
