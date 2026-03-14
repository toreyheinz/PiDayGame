defmodule PiDay.Game do
  import Ecto.Query
  alias PiDay.Repo
  alias PiDay.Game.{Player, Score}

  # --- Players ---

  def create_player(attrs) do
    %Player{}
    |> Player.changeset(attrs)
    |> Repo.insert()
  end

  def get_player(id), do: Repo.get(Player, id)

  def get_player_by_token(token) do
    Repo.get_by(Player, session_token: token)
  end

  # --- Scores ---

  def record_score(attrs) do
    result =
      %Score{}
      |> Score.changeset(attrs)
      |> Repo.insert()

    case result do
      {:ok, score} ->
        update_total_score(score.player_id)
        Phoenix.PubSub.broadcast(PiDay.PubSub, "leaderboard", {:score_updated, score})
        {:ok, score}

      error ->
        error
    end
  end

  defp update_total_score(player_id) do
    total =
      Score
      |> where(player_id: ^player_id)
      |> select([s], sum(s.score))
      |> Repo.one() || 0

    Player
    |> where(id: ^player_id)
    |> Repo.update_all(set: [total_score: total])
  end

  def leaderboard(limit \\ 20) do
    Player
    |> where([p], p.total_score > 0)
    |> order_by([p], desc: p.total_score)
    |> limit(^limit)
    |> Repo.all()
  end

  def top_scores(game_type, limit \\ 10) do
    Score
    |> where(game_type: ^game_type)
    |> order_by(desc: :score)
    |> limit(^limit)
    |> preload(:player)
    |> Repo.all()
  end

  # First 2000 digits of pi after "3."
  @pi_digits "14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196442881097566593344612847564823378678316527120190914564856692346034861045432664821339360726024914127372458700660631558817488152092096282925409171536436789259036001133053054882046652138414695194151160943305727036575959195309218611738193261179310511854807446237996274956735188575272489122793818301194912983367336244065664308602139494639522473719070217986094370277053921717629317675238467481846766940513200056812714526356082778577134275778960917363717872146844090122495343014654958537105079227968925892354201995611212902196086403441815981362977477130996051870721134999999837297804995105973173281609631859502445945534690830264252230825334468503526193118817101000313783875288658753320838142061717766914730359825349042875546873115956286388235378759375195778185778053217122680661300192787661119590921642019893809525720106548586327886593615338182796823030195203530185296899577362259941389124972177528347913151557485724245415069595082953311686172785588907509838175463746493931925506040092770167113900984882401285836160356370766010471018194295559619894676783744944825537977472684710404753464620804668425906949129331367702898915210475216205696602405803815019351125338243003558764024749647326391419927260426992279678235478163600934172164121992458631503028618297455570674983850549458858692699569092721079750930295532116534498720275596023648066549911988183479775356636980742654252786255181841757467289097777279380008164706001614524919217321721477235014144197356854816136115735255213347574184946843852332390739414333454776241686251898356948556209921922218427255025425688767179049460165346680498862723279178608578438382796797668145410095388378636095068006422512520511739298489608412848862694560424196528502221066118630674427862203919494504712371378696095636437191728746776465757396241389086583264599581339047802759009946576407895126946839835259570982582262052248940772671947826848260147699090264013639443745530506820349625245174939965143142980919065925093722169646151570985838741059788595977297549893016175392846813826868386894277415599185592524595395943104997252468084598727364469584865383673622262609912460805124388439045124413654976278079771569143599770012961608944169486855584840635"

  def pi_digits, do: @pi_digits

  def check_pi_digit(position, digit) when is_integer(position) and position >= 0 do
    expected = String.at(@pi_digits, position)
    expected == digit
  end

  # --- Math problems for Slice the Pi ---

  @problem_types [
    :circumference, :area, :arc_length, :sector_area,
    :sphere_volume, :sphere_surface, :cylinder_volume,
    :radians, :trig_value, :diameter_from_area
  ]

  def generate_math_problem do
    type = Enum.random(@problem_types)
    generate_problem(type)
  end

  defp generate_problem(:circumference) do
    r = Enum.random(1..20)
    answer = Float.round(2 * :math.pi() * r, 2)
    make_problem("Circumference of a circle with radius #{r}?", answer)
  end

  defp generate_problem(:area) do
    r = Enum.random(1..15)
    answer = Float.round(:math.pi() * r * r, 2)
    make_problem("Area of a circle with radius #{r}?", answer)
  end

  defp generate_problem(:arc_length) do
    r = Enum.random(2..12)
    angle = Enum.random([30, 45, 60, 90, 120, 180])
    answer = Float.round(2 * :math.pi() * r * (angle / 360), 2)
    make_problem("Arc length: radius=#{r}, angle=#{angle}\u00B0?", answer)
  end

  defp generate_problem(:sector_area) do
    r = Enum.random(2..10)
    angle = Enum.random([30, 45, 60, 90, 120, 180])
    answer = Float.round(:math.pi() * r * r * (angle / 360), 2)
    make_problem("Sector area: radius=#{r}, angle=#{angle}\u00B0?", answer)
  end

  defp generate_problem(:sphere_volume) do
    r = Enum.random(1..8)
    answer = Float.round(4 / 3 * :math.pi() * r * r * r, 2)
    make_problem("Volume of a sphere with radius #{r}?", answer)
  end

  defp generate_problem(:sphere_surface) do
    r = Enum.random(1..10)
    answer = Float.round(4 * :math.pi() * r * r, 2)
    make_problem("Surface area of a sphere with radius #{r}?", answer)
  end

  defp generate_problem(:cylinder_volume) do
    r = Enum.random(1..8)
    h = Enum.random(2..10)
    answer = Float.round(:math.pi() * r * r * h, 2)
    make_problem("Volume of cylinder: radius=#{r}, height=#{h}?", answer)
  end

  defp generate_problem(:radians) do
    {deg, rad_num, rad_den} = Enum.random([{30, 1, 6}, {45, 1, 4}, {60, 1, 3}, {90, 1, 2}, {120, 2, 3}, {180, 1, 1}, {270, 3, 2}, {360, 2, 1}])
    answer = Float.round(:math.pi() * rad_num / rad_den, 2)
    make_problem("Convert #{deg}\u00B0 to radians?", answer)
  end

  defp generate_problem(:trig_value) do
    {label, value} =
      Enum.random([
        {"sin(30\u00B0)", 0.5},
        {"cos(60\u00B0)", 0.5},
        {"sin(90\u00B0)", 1.0},
        {"cos(0\u00B0)", 1.0},
        {"sin(45\u00B0)", 0.71},
        {"cos(45\u00B0)", 0.71},
        {"sin(0\u00B0)", 0.0},
        {"cos(90\u00B0)", 0.0},
        {"tan(45\u00B0)", 1.0},
        {"sin(60\u00B0)", 0.87},
        {"cos(30\u00B0)", 0.87}
      ])

    answer = Float.round(value, 2)
    wrong = generate_trig_wrong(answer)
    %{question: "What is #{label}?", answer: answer, choices: Enum.shuffle([answer | wrong])}
  end

  defp generate_problem(:diameter_from_area) do
    d = Enum.random(2..16)
    area = Float.round(:math.pi() * (d / 2) * (d / 2), 2)
    answer = d * 1.0
    wrong = [d + 2.0, d - 1.0, d * 1.5] |> Enum.map(&Float.round(&1, 2))
    %{question: "Circle has area #{area}. What is the diameter?", answer: answer, choices: Enum.shuffle([answer | wrong])}
  end

  defp make_problem(question, answer) do
    %{question: question, answer: answer, choices: Enum.shuffle([answer | generate_wrong_answers(answer)])}
  end

  defp generate_wrong_answers(correct) when correct == 0.0 do
    [0.5, 1.0, -1.0]
  end

  defp generate_wrong_answers(correct) do
    offsets = [0.5, 1.5, 1.0 + :math.pi() / correct]
    Enum.map(offsets, fn mult -> Float.round(correct * mult, 2) end)
    |> Enum.uniq()
    |> Enum.reject(&(&1 == correct))
    |> Enum.take(3)
    |> case do
      list when length(list) < 3 ->
        list ++ Enum.map(1..(3 - length(list)), fn i -> Float.round(correct + i * 1.11, 2) end)

      list ->
        list
    end
  end

  defp generate_trig_wrong(correct) do
    candidates = [0.0, 0.25, 0.5, 0.71, 0.87, 1.0, 1.41, 1.73, -0.5, -1.0]
    candidates
    |> Enum.reject(&(&1 == correct))
    |> Enum.shuffle()
    |> Enum.take(3)
  end

  # --- Trivia Questions ---

  @trivia [
    %{q: "What is the 3rd digit of Pi after the decimal?", a: "1", choices: ["1", "4", "5", "9"]},
    %{q: "Who first proved that Pi is irrational?", a: "Johann Lambert", choices: ["Johann Lambert", "Leonhard Euler", "Isaac Newton", "Archimedes"]},
    %{q: "What is Euler's identity: e^(i\u03C0) + 1 = ?", a: "0", choices: ["0", "1", "\u03C0", "i"]},
    %{q: "Pi Day (3/14) is also whose birthday?", a: "Albert Einstein", choices: ["Albert Einstein", "Isaac Newton", "Stephen Hawking", "Nikola Tesla"]},
    %{q: "Approximately how many digits of Pi have been computed?", a: "Over 100 trillion", choices: ["Over 100 trillion", "About 1 billion", "About 10 billion", "Over 1 quadrillion"]},
    %{q: "What ancient civilization first estimated Pi?", a: "Babylonians", choices: ["Babylonians", "Romans", "Chinese", "Aztecs"]},
    %{q: "The ratio of a circle's circumference to its diameter is:", a: "Pi", choices: ["Pi", "2\u03C0", "Tau", "Phi"]},
    %{q: "What is Tau (\u03C4)?", a: "2\u03C0", choices: ["2\u03C0", "\u03C0/2", "\u03C0\u00B2", "\u221A\u03C0"]},
    %{q: "The Golden Ratio (Phi) is approximately:", a: "1.618", choices: ["1.618", "3.14", "2.718", "1.414"]},
    %{q: "What is e (Euler's number) approximately?", a: "2.718", choices: ["2.718", "3.14", "1.618", "2.236"]},
    %{q: "What shape has the largest area for a given perimeter?", a: "Circle", choices: ["Circle", "Square", "Equilateral triangle", "Regular hexagon"]},
    %{q: "How many radians in a full circle?", a: "2\u03C0", choices: ["2\u03C0", "\u03C0", "360", "4\u03C0"]},
    %{q: "What is i\u00B2 (imaginary unit squared)?", a: "-1", choices: ["-1", "1", "i", "0"]},
    %{q: "Archimedes estimated Pi by inscribing polygons with how many sides?", a: "96", choices: ["96", "12", "36", "360"]},
    %{q: "What is the sum of angles in a triangle (degrees)?", a: "180", choices: ["180", "360", "90", "270"]},
    %{q: "What is \u221A2 approximately?", a: "1.414", choices: ["1.414", "1.618", "1.732", "1.234"]},
    %{q: "The number Pi is:", a: "Irrational and transcendental", choices: ["Irrational and transcendental", "Rational", "Irrational but algebraic", "Imaginary"]},
    %{q: "What is the formula for a circle's area?", a: "\u03C0r\u00B2", choices: ["\u03C0r\u00B2", "2\u03C0r", "\u03C0d", "\u03C0r\u00B3"]},
    %{q: "sin\u00B2(x) + cos\u00B2(x) = ?", a: "1", choices: ["1", "0", "\u03C0", "2"]},
    %{q: "What is 0! (zero factorial)?", a: "1", choices: ["1", "0", "Undefined", "\u221E"]},
    %{q: "The Pythagorean theorem states: a\u00B2 + b\u00B2 = ?", a: "c\u00B2", choices: ["c\u00B2", "ab", "2c", "(a+b)\u00B2"]},
    %{q: "What is the derivative of sin(x)?", a: "cos(x)", choices: ["cos(x)", "-sin(x)", "tan(x)", "-cos(x)"]},
    %{q: "What mathematical constant appears in the normal distribution?", a: "Both Pi and e", choices: ["Both Pi and e", "Only Pi", "Only e", "Neither"]},
    %{q: "How is Pi defined geometrically?", a: "Circumference \u00F7 Diameter", choices: ["Circumference \u00F7 Diameter", "Area \u00F7 Radius", "Diameter \u00F7 Radius", "Perimeter \u00F7 Side"]},
    %{q: "Who used the symbol \u03C0 for the first time for this constant?", a: "William Jones", choices: ["William Jones", "Leonhard Euler", "Isaac Newton", "Carl Gauss"]},
    %{q: "What is the integral of 1/x?", a: "ln|x| + C", choices: ["ln|x| + C", "x\u00B2 + C", "1/x\u00B2 + C", "e^x + C"]},
    %{q: "What is the volume of a sphere formula?", a: "(4/3)\u03C0r\u00B3", choices: ["(4/3)\u03C0r\u00B3", "4\u03C0r\u00B2", "\u03C0r\u00B2h", "2\u03C0r\u00B3"]},
    %{q: "The Fibonacci sequence approaches what ratio?", a: "The Golden Ratio", choices: ["The Golden Ratio", "Pi", "e", "The Silver Ratio"]},
    %{q: "What is the billionth digit of Pi?", a: "9", choices: ["9", "1", "7", "3"]},
    %{q: "Buffon's Needle experiment can estimate:", a: "Pi", choices: ["Pi", "e", "The Golden Ratio", "Gravity"]}
  ]

  def get_trivia_question do
    q = Enum.random(@trivia)
    %{question: q.q, answer: q.a, choices: Enum.shuffle(q.choices)}
  end

  # --- Projectile Pi ---

  def generate_projectile_target do
    # Target at Pi-related distances
    target_x = Enum.random([
      Float.round(:math.pi() * 10, 1),
      Float.round(:math.pi() * 20, 1),
      Float.round(:math.pi() * 15, 1),
      Float.round(:math.pi() * 25, 1),
      Float.round(:math.pi() * 30, 1)
    ])

    %{target_x: target_x, gravity: 9.81}
  end
end
