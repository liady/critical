AWS Lambda Critical CSS Finder
===================
> Extract critical css in your site. Based heavily on [penthouse](https://github.com/pocketjoso/penthouse).

# Installation
```
npm install --production
```

# Build for Lambda
In an AWS linux console, run
```
npm install --production
npm run build
```
Upload the resulting `critical.zip` to lambda

# CLI Usage
```
npm run critical <url>
```
You can pass a second argument for the output file name (defaults to `critical.css`)

# Test vs baseline
run:
```
node tester.js
```
