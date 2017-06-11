# Sierpinski Triangle
_Sierpinski Triangle is a fractal and attractive fixed set with the overall shape of an equilateral triangle, subdivided recursively into smaller equilateral triangles. - Wikipedia_

![alt Sierpinski triangle evolution](https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Sierpinski_triangle_evolution.svg/512px-Sierpinski_triangle_evolution.svg.png)

## Sierpinski Triangle rendered with JavaScript
This piece of JavaScript is to create Sierpinski Triangle with _mouse wheel zooming_ and _drag panning_ features. When zoomed, the visible equilateral triangles divide into three equilateral sub triangles making it an infinately zoomable Sierpinski Triangle. Panning allows the Triangle to be moved around while keeping the same zoom level.

## Design
* Since it's a _fractal_ structure, the Triangle is considered as a _tree_, with each triangle being a _node_ and each containing three sub _nodes_.
* To prevent it from going into _deep recursion_, the triangles are no more divided into sub triangles if the sub triangles will be smaller than a minimum size.
* Triangles are also not divided if they will be drawn out of screen.

## Code Structure

The code is structured into following components:
1. __Controller__: Provides methods like _onZoom_, _onDrag_ to deals with user intractions.
2. __Graph__: Component that takes instructions from the Controller and deals with the SVG.
3. __Tree__ and __TreeNode__: Datastructure classes to deal with the dividing triangles. Each TreeNode represets a triangle and contains three sub nodes that are TreeNode objects themselves.
4. __Trignometry__: Utility library for calculating dimensions and coordinates of triangles.

