# Flow Component Maker

- install `total.js` framework

## How to run it?

- `$ node *****-run.js`
- `*****.js` contains a declaration of the component

### Analytics

This component automatically emits `flow.analytics` event when the value is changed:

```javascript
ON('flow.analytics', function(instance, current) {
    // current.value;
    // current.format;
    // current.type;
    // current.count;
    // current.period;
    // current.decimals;    
    // instance === A component instance

    // Here you can notify your charts or whatever...
});
```
