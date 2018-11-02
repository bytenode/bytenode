# How to run?

Install `bytenode` globally.
```console
[sudo] npm install -g bytenode
```

Run `slow-function.js` file:
```console
user@machine ~ $ bytenode -r slow-function.js
  slowFunction 3: 31.228ms
  slowFunction 4: 548.016ms
  slowFunction 5: 7353.032ms
```
or:
```console
user@machine ~ $ node slow-function.js
```

Now, compile the file:
```console
user@machine ~ $ bytenode -c slow-function.js
```

Then, run the compiled file `slow-function.jsc`:
```console
user@machine ~ $ bytenode -r slow-function.jsc
  slowFunction 3: 30.332ms
  slowFunction 4: 547.613ms
  slowFunction 5: 7509.545ms
```

On both LTS and Stable versions of Node.js (v8.12.0 and v11.0.0 respectively), `.jsc` files have almost the same performance as plain `.js` files.