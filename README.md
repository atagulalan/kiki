# kiki
Kiki, JavaScript için bir sözde kod derleyicisidir.

## Kurulum / kullanım

```bash
node bin/kiki.js compile examples/hello.kiki -o /tmp/hello.js
node bin/kiki.js run examples/hello.kiki
npm test
```

Programatik:

```js
import { compile, wrapProgram } from "kiki";
const js = wrapProgram(compile(source));
```

Örnekler: `examples/`. Test corpus: `EXAMPLES.md`.

## Önemli Farklar

- Boşluklar: Kiki JavaScript'in aksine boşluklar ile scope tanımlar. İki boşluk, varsayılan değerdir.
- Yeniden tanımlama: Kiki, son tanımlanan fonksiyonu geçerli sayar. Fonksiyonlar tekrar tanımlanabilir.
- Evrensel: Aksi iddia edilmedikçe Kiki'de tanımlanan her şey farklı fonksiyonlardan erişilebilir.
- Sembolsüz: Virgül, nokta, iki nokta, noktalı virgül, parantez (süslü, köşeli, normal) zorunlu değildir. Yazılırsa da göz ardı edilir.
- Asenkron: Her `on` async fonksiyona derlenir. `wait` ve `ask for` gibi bekleyen işlemler `await` üretir; diğer satırlar sırayla çalışır.

## Keywords

Kiki keyword'leri syntax sugar değil, **grammar token**dır. Ayırıcı rolündedirler; değişken, fonksiyon veya property adı olarak kullanılamaz ve tekrar atanamazlar. Parser, iki token arasındaki kelimeleri yol veya değer olarak okur.

Örnek: `if title is hello world set x to 1` → `is` ile `set` arası değer (`hello world`), `set` ile `to` arası hedef (`x`), `to` sonrası değer (`1`).

Kiki token'ları: `on`, `invoke`, `set`, `reset`, `get`, `of`, `and`, `or`, `in`, `from`, `with`, `as`, `one`, `find`, `filter`, `is`, `equals`, `equals to`, `is not`, `is greater than`, `is less than`, `is at least`, `is at most`, `greater than`, `less than`, `at least`, `at most`, `is empty`, `is not empty`, `contains`, `if`, `otherwise`, `else`, `unless`, `while`, `increase`, `decrease`, `by`, `every`, `for every`, `repeat`, `times`, `add`, `remove`, `sort`, `reverse`, `descending`, `join`, `append`, `ask for`, `send`, `wait`, `for`, `when`, `clicked`, `show`, `hide`, `create`, `labeled`, `saying`, `seconds`, `stop`, `return`, `to`, `not`, `defined`, `empty`, `plus`, `minus`, `times`, `divided by`, `modulo`, `count of`, `length of`, `first of`, `last of`, `text of`, `number of`, `floor of`, `character at`.

Kiki yalnızca JavaScript'e dönüştürme yaptığı için değişken adları ayrıca EcmaScript spesifikasyonuna uymalıdır. Kısaca, rakam ile başlayan değişkenler, "var", "let", "await" gibi [JavaScript Reserved Keyword](https://mathiasbynens.be/notes/reserved-keywords)leri almamaya dikkat edilmeli.

### `on`
Çağırılabilir bir key oluşturur. Basitçe fonksiyon olarak düşünülebilir.

```js
on hello thing
  if thing is not defined, set thing "World"
  alert "Hello " thing "!"
```

```js
hello: async (thing) => {
  if (thing === undefined) thing = "World";
  alert(`Hello ${thing}!`)
}
```

### `invoke`
Bir key'i çağırır.

```js
invoke hello "Bouba"
```

```js
await kiki.methods.hello("Bouba")
```

### `set` or `reset`
Bir değişken oluşturur veya oluşturulmuş değişkeni günceller. Birbiri yerine kullanılabilir.

```js
set enemy to "Aliens"
set friend name to "Bouba"
set friend shape to "Potato"
reset enemy to "Monsters"
reset enemy
```

```js
kiki.variables.enemy = "Aliens";
kiki.variables.friend.name = "Bouba";
kiki.variables.friend.shape = "Potato";
kiki.variables.enemy = "Monsters"
kiki.variables.enemy = undefined
```

### `get`
`kiki.variables` üzerindeki verilere her `on` içinden erişilebilir (evrensel). `get` zorunlu değildir; uzun yolu o fonksiyon içinde kısa lokal isimlere çeker.

Doğrudan erişim:

```js
on setup
  set friend name to "Bouba"
  set friend shape to "Potato"

on greet
  alert "Hello " friend name " the " friend shape
```

```js
setup: async () => {
  kiki.variables.friend.name = "Bouba";
  kiki.variables.friend.shape = "Potato";
}

greet: async () => {
  alert(`Hello ${kiki.variables.friend.name} the ${kiki.variables.friend.shape}`);
}
```

`get` ile aynı veri, lokal isimler:

```js
on greet
  get name and shape of friend
  alert "Hello " name " the " shape
```

```js
greet: async () => {
  const { name, shape } = kiki.variables.friend;
  alert(`Hello ${name} the ${shape}`);
}
```

### `is` veya `equals` veya `equals to`
Eşittir yerine kullanılır. Bir değişkenin veya değerin bir değere eşit olup olmadığını döner. Üçü de aynı `===` anlamına gelir.

```js
on check
  if score is 10
    alert "perfect"
  if name equals "Bouba"
    alert "hi Bouba"
  if shape equals to "Potato"
    alert "potato friend"
```

```js
check: async () => {
  if (kiki.variables.score === 10) {
    alert("perfect");
  }
  if (kiki.variables.name === "Bouba") {
    alert("hi Bouba");
  }
  if (kiki.variables.shape === "Potato") {
    alert("potato friend");
  }
}
```

### `is not`
Eşittir değildir yerine kullanılır (`!==`).

```js
on check
  if status is not "ready"
    alert "waiting"
```

```js
check: async () => {
  if (kiki.variables.status !== "ready") {
    alert("waiting");
  }
}
```

### `while`
Kiki'deki yegane döngü.

```js
on wait_three_seconds
  if countdown is 0, reset countdown to 3
  while countdown is not 0
    wait for 1 second
    decrease countdown
```

```js
wait_three_seconds: async () => {
  if (kiki.variables.countdown === 0) {
    kiki.variables.countdown = 3;
  }
  while (kiki.variables.countdown !== 0) {
    await wait(1 * 1000);
    kiki.variables.countdown -= 1;
  }
}
```

### `decrease` ve `increase`
Bir sayıyı arttırıp azaltmak için kullanılır. `by` keywordü ile değer girilebilir; yoksa varsayılan `1`.

```js
increase score
decrease lives
increase score by 3
decrease lives by 4
```

```js
kiki.variables.score += 1;
kiki.variables.lives -= 1;
kiki.variables.score += 3;
kiki.variables.lives -= 4;
```

### `every` or `for every`
ForEach döngüsü. Koleksiyondaki her öğe için gövde çalışır.

```js
on list_friends
  for every friend in friends
    alert friend name
```

```js
list_friends: async () => {
  for (const friend of kiki.variables.friends) {
    alert(friend.name);
  }
}
```

### `find`
Koleksiyonda tek eşleşme arar (`.find`). `with` sonrası alan-değer çiftleri `and` ile bağlanır.

```js
on search
  find one person in people with name "Arda" and age 12
  set match to person
```

```js
search: async () => {
  const person = kiki.variables.people.find(
    (person) => person.name === "Arda" && person.age === 12
  );
  kiki.variables.match = person;
}
```

### `filter`
Koleksiyonda çoklu eşleşme arar (`.filter`). `as` sonuç adını verir; kaynak koleksiyon değişmez.

```js
on search
  filter people as filtered with name "Arda" and age 12
  set matches to filtered
```

```js
search: async () => {
  const filtered = kiki.variables.people.filter(
    (person) => person.name === "Arda" && person.age === 12
  );
  kiki.variables.matches = filtered;
}
```

### `ask for`
Sunucudan veri alır (GET). `await` ile derlenir. İsteğe bağlı `with` gövde/query verir.

```js
on load_users
  ask for users from "/api/users"
  set people to users

on load_search
  ask for results from "/api/search" with query "Arda"
```

```js
load_users: async () => {
  const users = await ask("/api/users");
  kiki.variables.people = users;
}

load_search: async () => {
  const results = await ask("/api/search", { query: "Arda" });
}
```

### `send`
Sunucuya veri gönderir (POST). `await` ile derlenir.

```js
on save_user
  send user to "/api/users"
```

```js
save_user: async () => {
  await send("/api/users", kiki.variables.user);
}
```

### `create`
Bir UI elemanı oluşturur.

```js
on draw
  create button labeled "Click me"
  create text saying "Hello"
```

```js
draw: async () => {
  create("button", { labeled: "Click me" });
  create("text", { saying: "Hello" });
}
```

### `when` … `is clicked`
UI olayına bağlanır.

```js
on draw
  create button labeled "Click me"
  when button is clicked
    alert "clicked"
```

```js
draw: async () => {
  const button = create("button", { labeled: "Click me" });
  button.addEventListener("click", async () => {
    alert("clicked");
  });
}
```

### `show`, `hide`, `set text of` … `to`
UI görünürlüğü ve metin.

```js
show banner
hide banner
set text of title to "Welcome"
```

```js
show(kiki.variables.banner);
hide(kiki.variables.banner);
setText(kiki.variables.title, "Welcome");
```

### `otherwise` / `else`
`if` dalının alternatifi. İkisi aynı anlama gelir.

```js
on check
  if score is at least 10
    alert "pass"
  otherwise
    alert "fail"
```

```js
check: async () => {
  if (kiki.variables.score >= 10) {
    alert("pass");
  } else {
    alert("fail");
  }
}
```

### `unless`
`if not` günlük hali.

```js
on gate
  unless ready
    alert "waiting"
```

```js
gate: async () => {
  if (!kiki.variables.ready) {
    alert("waiting");
  }
}
```

### `stop` / `return`
`on` gövdesinden çıkar. Değerli dönüş: `return score`.

```js
on check
  if score is 0
    stop
  alert "ok"
```

```js
check: async () => {
  if (kiki.variables.score === 0) {
    return;
  }
  alert("ok");
}
```

### `and` / `or` (koşullarda)
Mantıksal bağlaçlar.

```js
on check
  if age is 12 and name is "Arda"
    alert "match"
  if status is "error" or status is "fail"
    alert "bad"
```

```js
check: async () => {
  if (kiki.variables.age === 12 && kiki.variables.name === "Arda") {
    alert("match");
  }
  if (kiki.variables.status === "error" || kiki.variables.status === "fail") {
    alert("bad");
  }
}
```

### `is greater than` / `is less than` / `is at least` / `is at most`
Sayısal karşılaştırma (`>`, `<`, `>=`, `<=`).

```js
on check
  if score is greater than 10
    alert "high"
  if score is less than 3
    alert "low"
  if score is at least 5
    alert "ok"
  if score is at most 100
    alert "capped"
```

```js
check: async () => {
  if (kiki.variables.score > 10) alert("high");
  if (kiki.variables.score < 3) alert("low");
  if (kiki.variables.score >= 5) alert("ok");
  if (kiki.variables.score <= 100) alert("capped");
}
```

### `is empty` / `is not empty`
Koleksiyon veya metin boş mu.

```js
on check
  if people is empty
    alert "none"
  if name is not empty
    alert name
```

```js
check: async () => {
  if (kiki.variables.people.length === 0) alert("none");
  if (kiki.variables.name !== "") alert(kiki.variables.name);
}
```

### `contains`
Metin veya koleksiyon içerir mi.

```js
on check
  if name contains "Ar"
    alert "found"
  if people contains friend
    alert "in list"
```

```js
check: async () => {
  if (kiki.variables.name.includes("Ar")) alert("found");
  if (kiki.variables.people.includes(kiki.variables.friend)) alert("in list");
}
```

### `add` … `to` / `remove` … `from`
Listeye ekle / listeden çıkar.

```js
add friend to people
remove friend from people
```

```js
kiki.variables.people.push(kiki.variables.friend);
kiki.variables.people = kiki.variables.people.filter(
  (item) => item !== kiki.variables.friend
);
```

### `sort` … `by`
Listeyi alana göre sırala. `descending` isteğe bağlı.

```js
sort people by age
sort people by name descending
```

```js
kiki.variables.people.sort((a, b) => a.age - b.age);
kiki.variables.people.sort((a, b) => (a.name < b.name ? 1 : -1));
```

### `count` / `length of`
Eleman veya karakter sayısı.

```js
set total to count of people
set size to length of name
```

```js
kiki.variables.total = kiki.variables.people.length;
kiki.variables.size = kiki.variables.name.length;
```

### `first of` / `last of`
Listenin ilk / son elemanı.

```js
set head to first of people
set tail to last of people
```

```js
kiki.variables.head = kiki.variables.people[0];
kiki.variables.tail = kiki.variables.people[kiki.variables.people.length - 1];
```

### `join` … `with`
Parçaları veya bir listeyi birleştir.

```js
set line to join name and shape with " the "
set out to join words with " "
```

```js
kiki.variables.line = [kiki.variables.name, kiki.variables.shape].join(" the ");
kiki.variables.out = kiki.variables.words.join(" ");
```

### `append` … `to`
Metnin sonuna ekle.

```js
append "!" to message
```

```js
kiki.variables.message = kiki.variables.message + "!";
```

### `every` … `seconds`
Belirli aralıkla tekrar eder (`setInterval`). Tek seferlik bekleme için `wait for` kullanılır.

```js
on tick
  every 5 seconds
    increase score
```

```js
tick: async () => {
  setInterval(() => {
    kiki.variables.score += 1;
  }, 5 * 1000);
}
```

### `for every` … `from` … `to`
Sayı aralığı döngüsü (dahil).

```js
on sum_to_n
  set sum to 0
  for every i from 1 to n
    increase sum by i
```

```js
sum_to_n: async () => {
  kiki.variables.sum = 0;
  for (let i = 1; i <= kiki.variables.n; i++) {
    kiki.variables.sum += i;
  }
}
```

### `repeat` … `times`
Gövdeyi N kez çalıştırır.

```js
on bump
  repeat 5 times
    increase score
```

```js
bump: async () => {
  for (let _i0 = 0; _i0 < 5; _i0++) {
    kiki.variables.score += 1;
  }
}
```

### Matematik: `plus` `minus` `times` `divided by` `modulo`
Semboller göz ardı edildiği için işlemler kelime ile yazılır.

```js
set f to c times 9 divided by 5 plus 32
set rem to n modulo 2
```

```js
kiki.variables.f = ((kiki.variables.c * 9) / 5) + 32;
kiki.variables.rem = kiki.variables.n % 2;
```

### `empty` ve `reverse`
Boş liste ve listeyi ters çevirme.

```js
set people to empty
reverse people
```

```js
kiki.variables.people = [];
kiki.variables.people = kiki.variables.people.slice().reverse();
```

### `ask for` (kullanıcı)
`from` yoksa terminal/prompt ile kullanıcıdan alır.

```js
ask for name
alert "Hello " name
```

```js
const name = await kiki.askUser("name");
kiki.variables.name = name;
alert(`Hello ${name}`);
```

### `keep asking for` … `until`
Koşul sağlanana kadar sorar. Gövde, koşul henüz doğru değilken her turda çalışır.

```js
keep asking for number until number is 0
  increase sum by number
  increase count
```

```js
let number = await kiki.askUser("number");
kiki.variables.number = number;
while (!(number === 0)) {
  kiki.variables.sum += number;
  kiki.variables.count += 1;
  number = await kiki.askUser("number");
  kiki.variables.number = number;
}
```

### `title case of`
Her kelimenin ilk harfini büyütür.

```js
set out to title case of sentence
```

```js
kiki.variables.out = String(kiki.variables.sentence).split(/\s+/).map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "").join(" ");
```

### `is uppercase` / `is lowercase` / `is a letter`
Harf sınıfı kontrolleri.

```js
if ch is uppercase
  increase upper
if ch is a letter
  alert ch
```

```js
if (/^[A-Za-z]$/.test(ch) && ch === ch.toUpperCase()) upper += 1;
if (/^[A-Za-z]$/.test(ch)) alert(ch);
```

