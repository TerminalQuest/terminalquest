# Finding the Password Indexes

This final challenge requires that you learn to address data from a two-dimensional array. These types of objects are often used to represent information that exists in 2D space, like points on a grid, or pieces on a chess board.

Like a regular array, you access the data within using **subscript notation**.

In a one-dimensional array, there is only one subscript. Consider the following array.

```js
const animals = ['dog', 'cat', 'bird'];
```

The value `cat` is found at `animals[1]` - the second index of the array.

In a 2D array, instead of an array of strings or numbers, you are working with an array of arrays. Consider the following array, which contains what might be a series of X/Y coordinates on a line:

```js
const points = [ [0,1], [1,2], [2,3] ];
```

The value at index zero of the `points` array is another array, with the value `[0,1]`. So `points[0]` is equal to `[0,1]`. Since `points[0]` is an array, we can use subscript notation to access its values as well. In this example, `points[0][1]` is equal to `1` - the second member of the array within the `points` array.

The simple way to think about this is that the first number is the "row" of a 2D array, and the second number is the "column". This is more easily visible if you format the array a bit more nicely, like this (note that the formatting does not change the value of the object):

```js
const points = [ 
  [0, 1], 
  [1, 2], 
  [2, 3] 
];
```

Now that you have a basic idea of how to access data in a 2D array, answer the questions on the right and click the *HACK* button. Use the data from the 2D array on the Objective tab (not the example above).