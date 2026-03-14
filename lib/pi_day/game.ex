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

  def generate_math_problem do
    type = Enum.random([:circumference, :area, :arc_length, :sector_area])
    generate_problem(type)
  end

  defp generate_problem(:circumference) do
    r = Enum.random(1..20)
    answer = Float.round(2 * :math.pi() * r, 2)
    wrong = generate_wrong_answers(answer)

    %{
      question: "What is the circumference of a circle with radius #{r}?",
      answer: answer,
      choices: Enum.shuffle([answer | wrong]),
      type: :circumference
    }
  end

  defp generate_problem(:area) do
    r = Enum.random(1..15)
    answer = Float.round(:math.pi() * r * r, 2)
    wrong = generate_wrong_answers(answer)

    %{
      question: "What is the area of a circle with radius #{r}?",
      answer: answer,
      choices: Enum.shuffle([answer | wrong]),
      type: :area
    }
  end

  defp generate_problem(:arc_length) do
    r = Enum.random(2..12)
    angle = Enum.random([30, 45, 60, 90, 120, 180])
    answer = Float.round(2 * :math.pi() * r * (angle / 360), 2)
    wrong = generate_wrong_answers(answer)

    %{
      question: "Arc length: radius=#{r}, central angle=#{angle} degrees?",
      answer: answer,
      choices: Enum.shuffle([answer | wrong]),
      type: :arc_length
    }
  end

  defp generate_problem(:sector_area) do
    r = Enum.random(2..10)
    angle = Enum.random([30, 45, 60, 90, 120, 180])
    answer = Float.round(:math.pi() * r * r * (angle / 360), 2)
    wrong = generate_wrong_answers(answer)

    %{
      question: "Sector area: radius=#{r}, angle=#{angle} degrees?",
      answer: answer,
      choices: Enum.shuffle([answer | wrong]),
      type: :sector_area
    }
  end

  defp generate_wrong_answers(correct) do
    [
      Float.round(correct * 0.5, 2),
      Float.round(correct * 1.5, 2),
      Float.round(correct + :math.pi(), 2)
    ]
  end
end
