defmodule PiDayWeb.Router do
  use PiDayWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {PiDayWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :require_player do
    plug PiDayWeb.Plugs.RequirePlayer
  end

  scope "/", PiDayWeb do
    pipe_through :browser

    get "/", PageController, :home
    post "/join", PageController, :join
  end

  scope "/", PiDayWeb do
    pipe_through [:browser, :require_player]

    get "/play", GameController, :play
  end

  scope "/", PiDayWeb do
    pipe_through :browser

    live "/spectate", SpectateLive
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:pi_day, :dev_routes) do
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: PiDayWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
