# XYZ ... ZYX

## PUG Template

```pug
<!-- Ebben az esetben a stílus ki lesz rakva globális stíluként  -->
:stylus
   .StylusStylesHere
      color: beautiful

h1(class=style.StylusStylesHere) PUG Template
```

```pug
div
   :stylus(shadow)
      .ShadowClass
         color: dark-beautiful

   label(class=style.ShadowClass)

```
