# 100 small programs (Kiki test corpus)

Language-agnostic mini problems to exercise the Kiki grammar. Sources mixed and shortened from public beginner lists:

- [Adrian Neumann — Simple Programming Problems](https://adriann.github.io/programming_problems.html) (CC-BY-SA)
- [mdyasinahmed/100-Python-Practice-Problems](https://github.com/mdyasinahmed/100-Python-Practice-Problems)
- Common beginner drills (FizzBuzz, palindrome, etc.)

Solutions live in `examples/corpus/NN_name.kiki` (NN = problem number).

## Progress

All **100** briefs have a corresponding `.kiki` program under `examples/corpus/`.
Run non-interactive ones with `node bin/kiki.js run examples/corpus/….kiki`.
Interactive (`ask for` without `from`): 02, 03, 100.

## Elementary (1–25)

1. Print `Hello World`.
2. Greet the user by name.
3. Greet only if the name is `Alice` or `Bob`.
4. Sum the numbers from 1 to `n`.
5. Sum multiples of 3 or 5 up to `n`.
6. Given `n`, compute either the sum or the product of 1…`n` (user chooses).
7. Print a multiplication table up to 12.
8. Print prime numbers up to a limit.
9. Number guessing game: too high / too low; count tries.
10. Print the next 20 leap years.
11. Odd or even checker.
12. Leap year checker.
13. Celsius to Fahrenheit.
14. Swap two numbers.
15. Sum of three digits of a number.
16. Reverse a four-digit number; check if palindrome number.
17. Oldest of three ages.
18. Profit or loss from cost and selling price.
19. Simple interest from principal, rate, time.
20. Divisible by both 3 and 6?
21. Weather label from temperature and humidity thresholds.
22. Sum of squares of three digits.
23. Factorial of `n`.
24. Sum of first `n` natural numbers.
25. Print the first 25 odd numbers.

## Numbers & series (26–45)

26. Check if a number is prime.
27. First 25 primes.
28. First 20 Fibonacci numbers.
29. Count digits in a number.
30. Reverse digits of any integer.
31. All factors of a number.
32. HCF (GCD) of two numbers.
33. LCM of two numbers.
34. Armstrong number check.
35. Print Armstrong numbers from 100 to 1000.
36. Compound interest.
37. Compute `n + nn + nnn` for digit `n`.
38. Multiply two numbers without `*` (use loops / addition).
39. Population growing 10% per year for 10 years (print each year).
40. Keep reading numbers until 0; print sum and average.
41. Simplify a fraction (numerator / denominator).
42. FizzBuzz from 1 to 100.
43. Collatz steps until 1.
44. Check perfect square.
45. Sum of digits until a single digit (digital root).

## Lists (46–70)

46. Largest element in a list.
47. Reverse a list.
48. Check whether an element occurs in a list.
49. Elements on odd positions.
50. Running total of a list.
51. Sum of list with `while`.
52. Sum of list with `for every`.
53. Concatenate two lists.
54. Interleave two lists (`a,1,b,2,…`).
55. Merge two sorted lists.
56. Rotate a list by `k`.
57. First 100 Fibonacci numbers as a list.
58. Digits of a number as a list.
59. Remove duplicates from a list.
60. Max without a built-in max (loop).
61. Search for a number in a list (`find`).
62. Square every item into a new list.
63. Split odds and evens into two lists.
64. Replace an item in a list if found.
65. Check if a list is ascending.
66. Sort a list ascending.
67. Sort people by age.
68. Filter people with age at least 18.
69. Find one person in people with name `"Arda"`.
70. Count of people; first and last of people.

## Strings (71–85)

71. String palindrome check.
72. Length of a string without a built-in length (loop).
73. Username from email (`before @`).
74. Frequency of a character in a string.
75. Count vowels in a string.
76. Remove a given character from a string.
77. Reverse words in a sentence.
78. Word count in a string.
79. Title-case a string (manual).
80. Uppercase / lowercase character counts.
81. Join name and shape with `" the "`.
82. Append `"!"` to a message.
83. Does `name` contain `"Ar"`?
84. Frame a list of words in a `*` box (print lines).
85. Pig Latin: move first letter to end and add `ay`.

## UI / async / I/O shaped (86–100)

86. Button labeled `Click me`; when clicked, alert `hi`.
87. Show a banner; hide it after button click.
88. Set text of a title to `"Welcome"`.
89. Ask for users from `"/api/users"`; set people to users.
90. Send user to `"/api/users"`.
91. Wait for 1 second; then alert `done`.
92. Every 5 seconds, increase score by 1.
93. Countdown from 3 with `while` and `wait for 1 second`.
94. Unless ready, alert `waiting`; otherwise alert `go`.
95. If score is at least 10 alert `pass` otherwise `fail`.
96. If age is 12 and name is `"Arda"` alert `match`.
97. If people is empty alert `none`.
98. Add friend to people; remove friend from people.
99. Filter people as adults with age at least 18; set matches to adults.
100. Mini form flow: create text + button; on click, append input to a list and show count.
