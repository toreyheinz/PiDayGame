defmodule PiDayWeb.Presence do
  use Phoenix.Presence,
    otp_app: :pi_day,
    pubsub_server: PiDay.PubSub
end
