# kiki
Kiki, JavaScript için bir sözde kod derleyicisidir.

## Önemli Farklar

- Boşluklar: Kiki JavaScript'in aksine boşluklar ile scope tanımlar. İki boşluk, varsayılan değerdir.
- Yeniden tanımlama: Kiki, son tanımlanan fonksiyonu geçerli sayar. Fonksiyonlar tekrar tanımlanabilir.
- Evrensel: Aksi iddia edilmedikçe Kiki'de tanımlanan her şey farklı fonksiyonlardan erişilebilir.
- Sembolsüz: Virgül, nokta, iki nokta, noktalı virgül, parantez (süslü, köşeli, normal) içermez. İçerirse de silinir.
- Senkron: Tüm methodlar asenkron çağırılır, ancak method içerisindeki kodlar tamamen senkronizedir.

## Keywords

Kiki yalnızca JavaScript'e dönüştürme yaptığı için değişken adları EcmaScript spesifikasyonuna uymalıdır. Kısaca, rakam ile başlayan değişkenler, "var", "let", "await" gibi [JavaScript Reserved Keyword](https://mathiasbynens.be/notes/reserved-keywords)leri almamaya dikkat edilmeli.

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
kiki.methods.hello("Bouba")
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
Bir değişkeni getirir. Scope'u global değildir.

```js
get name and shape of friend
```

```js
const { name, shape } = kiki.variables.friend
```

### `is` veya `equals` veya `equals to`
Eşittir yerine kullanılır. Bir değişkenin veya değerin bir değere eşit olup olmadığını döner.

### `is not`
Eşittir değildir yerine kullanılır.

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
  if(countdown === 0) kiki.variables.countdown = 3;
  while(countdown !== 0) {
    await wait(1 * 1000);
    kiki.variables.countdown = kiki.variables - 1;
  }
}
```

### `decrease` ve `increase`
Bir sayıyı arttırıp azaltmak için kullanılır. `by` keywordü ile değer girilebilir.
Örnek kullanım: `increase something`, `decrease something by 4`, `increase something by 3`.

### `every` or `for every`
ForEach döngüsü.

### `ask for`
Sunucudan veri alır. Senkron çalışır.

### `create`
Bir UI elamanı oluşturur.

