# crudex

CRUD+ controllers for [bex](https://www.npmjs.com/package/bex)

## Example

```js
require('crudex')(db, {
	table: 'table',
	view: 'v_table',
	validator: {
		name: v.isLength(10),
		email: v.isEmail()
	},
	create: {
		before: function (params) {
			params.password = bcrypt(params.password);
		}
	},
	'&/plus10/:param': function (params) {
		return this.json({ param: params.param + 10 });
	}
})
```

## todo: good readme

## License

MIT
