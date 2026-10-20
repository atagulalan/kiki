# kiki
Kiki, JavaScript için bir sözde kod derleyicisidir.

## Önemli Farklar

- Boşluklar: Kiki JavaScript'in aksine boşluklar ile scope tanımlar. İki boşluk, varsayılan değerdir.
- Yeniden tanımlama: Kiki, son tanımlanan fonksiyonu geçerli sayar. Fonksiyonlar tekrar tanımlanabilir.
- Evrensel: Aksi iddia edilmedikçe Kiki'de tanımlanan her şey farklı fonksiyonlardan erişilebilir.
- Sembolsüz: Virgül, nokta, iki nokta, noktalı virgül, parantez (süslü, köşeli, normal) zorunlu değildir. Yazılırsa da göz ardı edilir.
- Asenkron: Her `on` async fonksiyona derlenir. `wait` ve `ask for` gibi bekleyen işlemler `await` üretir; diğer satırlar sırayla çalışır.

## Keywords

Kiki keyword'leri syntax sugar değil, **grammar token**dır. Ayırıcı rolündedirler; değişken, fonksiyon veya property adı olarak kullanılamaz ve tekrar atanamazlar. Parser, iki token arasındaki kelimeleri yol veya değer olarak okur.

Örnek: `if title is hello world set x to 1` → `is` ile `set` arası değer (`hello world`), `set` ile `to` arası hedef (`x`), `to` sonrası değer (`1`).

Kiki token'ları: `on`, `invoke`, `set`, `reset`, `get`, `of`, `and`, `in`, `from`, `with`, `as`, `one`, `find`, `filter`, `is`, `equals`, `equals to`, `is not`, `if`, `while`, `increase`, `decrease`, `by`, `every`, `for every`, `ask for`, `wait`, `for`, `create`, `labeled`, `saying`, `to`, `not`, `defined`.

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
Sunucudan veri alır. `await` ile derlenir.

```js
on load_users
  ask for users from "/api/users"
  set people to users
```

```js
load_users: async () => {
  const users = await ask("/api/users");
  kiki.variables.people = users;
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

