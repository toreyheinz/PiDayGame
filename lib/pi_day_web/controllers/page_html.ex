defmodule PiDayWeb.PageHTML do
  use PiDayWeb, :html

  embed_templates "page_html/*"

  @avatar_symbols %{
    "pi" => "\u03C0",
    "sigma" => "\u03A3",
    "delta" => "\u0394",
    "omega" => "\u03A9",
    "theta" => "\u03B8",
    "lambda" => "\u03BB",
    "phi" => "\u03C6",
    "psi" => "\u03C8",
    "epsilon" => "\u03B5",
    "zeta" => "\u03B6"
  }

  def avatar_symbol(key), do: Map.get(@avatar_symbols, key, "?")
end
