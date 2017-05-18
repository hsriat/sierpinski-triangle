       //
     //1//
   //    //
 //3/////2//

var Sierpinski = {};

$(function() {

  Sierpinski.Controller.init($(window).width(), $(window).height());

  $(document).on('wheel', function(e) {
    e.preventDefault();
    Sierpinski.Controller.onZoom(-e.originalEvent.deltaY, {x: e.originalEvent.clientX, y: e.originalEvent.clientY});
  });

  $(document).on('dblclick', function(e) {
    e.preventDefault();
    Sierpinski.Controller.onDblClick({x: e.clientX, y: e.clientY});
  });

  $(document).on('mousedown', function(e) {
    e.preventDefault();
    Sierpinski.Controller.onDragStart({x: e.clientX, y: e.clientY});

    $(document).on('mousemove.panning', function(e) {
      e.preventDefault();
      Sierpinski.Controller.onDrag({x: e.clientX, y: e.clientY});
    });
  });

  $(document).on('mouseup', function(e) {
    e.preventDefault();
    Sierpinski.Controller.onDragStop();
    $(document).off('.panning');
  });

});

Sierpinski.Controller = {

  zoomSpeed: 10,
  /*
   * Scroll wheel zoom speed factor
   */

  init: function(width, height) {
  /*
   * Intialises the controller and creates the graph
   * @param Screen width
   * @param Screen height
   */
    Sierpinski.Graph.init(width, height);
    Sierpinski.Graph.draw();
    this.drawTimer  = false;
    this.dragging   = false;
    this.panStart   = {};
  },

  onZoom: function(delta, mouseCoords) {
  /*
   * Zoom handler for mouse wheel event
   * @param Wheel event's horizontal delta (deltaY)
   * @param Mouse coords
   */
    if (this.drawTimer) {
      window.clearTimeout(this.drawTimer);
    }
    this.drawTimer = window.setTimeout(function() {
      Sierpinski.Graph.draw(true);
    }, 100);
    Sierpinski.Graph.zoom(1 + (delta * this.zoomSpeed)/10000, mouseCoords);
  },

  onDragStart: function(mouseCoords) {
  /*
   * Drag start handler
   * @param Mouse coords
   */
    this.panStart = mouseCoords;
  },

  onDrag: function(mouseCoords) {
  /*
   * Drag handler
   * @param Mouse coords
   */
    this.dragging = true;
    Sierpinski.Graph.pan({x: mouseCoords.x - this.panStart.x, y: mouseCoords.y - this.panStart.y});
  },

  onDragStop: function() {
  /*
   * Drag stop handler
   * @param Mouse coords
   */
    if (this.dragging) {
      this.panStart = {};
      this.dragging = false;
      Sierpinski.Graph.draw();
    }
  },

  onDblClick: function(mouseCoords) {
  /*
   * Double click handler
   * @param Mouse coords
   */
    Sierpinski.Graph.zoom(1.5, mouseCoords);
    Sierpinski.Graph.draw();
  }
};


Sierpinski.Graph = {

  initialDepth: 6,
  /*
   * Depth of the intially displayed Sierpinski Triangle
   */

  minZoomFactor: 0.4,
  /*
   * Ignore zooming out if zoom factor is less then this value
   */

  bufferSize: 0.7,
  /*
   * Buffered screen outside the current visible area
   */

  svgNS: 'http://www.w3.org/2000/svg',
  /*
   * Namespace for SVG tags
   */

  init: function(width, height) {
  /*
   * Initialises the graph with the given width and height
   * @param Width of the drawable area
   * @param Height of the drawable area
   */
    this.width                = width;
    this.height               = height;
    this.sideLength           = Math.min(this.height * 0.6, this.width * 0.6);                // initial side length of the root triangle
    this.offset               = {x: this.width/2, y: this.height/2};                          // in the beginning, draw in the middle
    this.minSize              = Math.ceil(this.sideLength / Math.pow(2, this.initialDepth));  // min side length required to split a triangle
    this.immediateZoomFactor  = 1;
    this.finalZoomFactor      = 1;

    this.initTree();
  },

  initTree: function () {
  /*
   * Initialises the Sierpinski triangle tree
   */
    this.svg = document.body.appendChild(document.createElementNS(this.svgNS, 'svg'));
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);

    this.tree = new Sierpinski.Tree(this.svg.appendChild(document.createElementNS(this.svgNS, 'g')));
  },

  draw: function(ignoreIfSameZoom) {
  /*
   * Draws (or redraws) whole triangle (ie. all required nodes)
   * Takes coords changed zooming and panning into account after resetting viewBox to the inital state
   * @param {Boolean} If true, will not redraw if immediateZoomFactor has not changed
   */

    // zoom has not changed and the ignore-flag is on
    if (ignoreIfSameZoom && this.immediateZoomFactor === 1) {
      return;
    }

    this.finalZoomFactor = this.finalZoomFactor * this.immediateZoomFactor;

    // reset viewBox to screen
    this.svg.setAttribute('viewBox', '0 0 ' + this.width + ' ' + this.height);

    // calculate new offset if zoom has been applied
    if (this.zoomOffset) {
      this.offset.x   = this.offset.x - (this.zoomOffset.x - this.offset.x) * this.immediateZoomFactor;
      this.offset.y   = this.offset.y - (this.zoomOffset.y - this.offset.y) * this.immediateZoomFactor;
      this.zoomOffset = false;
    }

    // calculate new offset if triangle is dragged
    if (this.panOffset) {
      this.offset.x   = this.offset.x + this.panOffset.x;
      this.offset.y   = this.offset.y + this.panOffset.y;
      this.panOffset  = false;
    }

    // draw the tree at the required coords and with the required triangle side length
    this.tree.draw(this.offset.x, this.offset.y, this.sideLength * this.finalZoomFactor);

    console.log('Nodes: ', this.tree.root.countNodes());
    console.log('Depth: ', this.tree.root.getDepth());
    console.log('Polygons: ', this.svg.getElementsByTagName('polygon').length);

    // reset immediateZoomFactor - gets changed by zoom method
    this.immediateZoomFactor = 1;
  },

  zoom: function(delta, position) {
  /*
   * Zooms the triangle by chaning SVG's viewBox
   * @param Zoom factor delta
   * @param {Object} x,y coords of the mouse position
   * @return {Boolean} true if zoom has been applied, false otherwise
   */
    // force minZoomFactor when zooming out
    if (delta < 1 && this.immediateZoomFactor * this.finalZoomFactor <= this.minZoomFactor) {
      return false;
    }

    // zoom grows everytime
    this.immediateZoomFactor = this.immediateZoomFactor * delta;

    // calculate current offset of the centre of the triangle
    this.zoomOffset = {
      x: this.offset.x/this.immediateZoomFactor + (position.x - position.x/this.immediateZoomFactor),
      y: this.offset.y/this.immediateZoomFactor + (position.y - position.y/this.immediateZoomFactor)
    };

    // rescale the svg to apply zooming effect
    this.svg.setAttribute('viewBox',
      (position.x - position.x/this.immediateZoomFactor) + ' ' +
      (position.y - position.y/this.immediateZoomFactor) + ' ' +
      this.width/this.immediateZoomFactor + ' ' +
      this.height/this.immediateZoomFactor
    );

    return true;
  },

  pan: function(coords) {
  /*
   * Pans the triangle by changing SVG's viewBox
   * @param {Object} Change in x and y coords
   */
    this.panOffset = coords;

    // pan the svg viewBox
    this.svg.setAttribute('viewBox',
      -coords.x + ' ' +
      -coords.y + ' ' +
      this.width + ' ' +
      this.height
    );
  }
};


Sierpinski.Tree = function(container) {
  /*
   * Endless Sierpinski Tree
   * @param Container SVG node
   */
  this.container = container;
  this.root = new Sierpinski.TreeNode();
  this.root.tree = this;
};

Sierpinski.Tree.prototype.draw = function(centerX, centerY, sideLength) {
  /*
   * Draws the Sierpinski triangle at the given coords
   * @param X coord of the centre of the triangle
   * @param Y coord of the centre of the triangle
   * @param Length of the side of the triangle
   */
  var coords = Sierpinski.Trigonometry.translateCoords(centerX, centerY, sideLength);
  this.root.draw(coords.x, coords.y, coords.sideLength);
};


Sierpinski.TreeNode = function(parent) {
  /*
   * Individual Sierpinski Tree node - each node has three child nodes
   * @param Parent TreeNode object
   */
  this.depth        = parent ? parent.depth + 1 : 0;
  this.tree         = parent ? parent.tree : null;
  this.firstChild   = false;
  this.secondChild  = false;
  this.thirdChild   = false;
};

Sierpinski.TreeNode.prototype.countNodes = function() {
  /*
   * Dev method to recursively count all sub nodes in the node (including the node)
   */
  var count = 1;
  if (this.firstChild) {
    count = count + this.firstChild.countNodes();
    count = count + this.secondChild.countNodes();
    count = count + this.thirdChild.countNodes();
  }
  return count;
};

Sierpinski.TreeNode.prototype.getDepth = function() {
  /*
   * Dev method to recursively get the maximum node depth for the current node
   */
  if (this.firstChild) {
    return Math.max(this.firstChild.getDepth(), this.secondChild.getDepth(), this.thirdChild.getDepth());
  }
  return this.depth;
};

Sierpinski.TreeNode.prototype.reproduce = function() {
  /*
   * Creates three child nodes for the current TreeNode
   */
  if (!this.firstChild) {
    this.firstChild   = new Sierpinski.TreeNode(this);
    this.secondChild  = new Sierpinski.TreeNode(this);
    this.thirdChild   = new Sierpinski.TreeNode(this);
  }
};

Sierpinski.TreeNode.prototype.draw = function(x, y, sideLength) {
  /*
   * Recursively draws the current node
   * @param X coord of the bottom left corner
   * @param Y coord of the bottom left corner
   * @param Length of the side of the triangle
   */
  var points = Sierpinski.Trigonometry.getAllVertices(x, y, sideLength);

  // if the node is outisde the visible and the buffered area, remove it to avoid unwanted recursion
  var bufX = Sierpinski.Graph.width * Sierpinski.Graph.bufferSize;
  var bufY = Sierpinski.Graph.height * Sierpinski.Graph.bufferSize;
  if (
    (points[0].x <= -bufX && points[1].x <= -bufX && points[2].x <= -bufX) ||
    (points[0].y <= -bufY && points[1].y <= -bufY && points[2].y <= -bufY) ||
    (points[0].x > Sierpinski.Graph.width + bufX && points[1].x > Sierpinski.Graph.width + bufX && points[2].x > Sierpinski.Graph.width + bufX) ||
    (points[0].y > Sierpinski.Graph.height + bufY && points[1].y > Sierpinski.Graph.height + bufY && points[2].y > Sierpinski.Graph.height + bufY)
  ) {
    this.removePolygon();
    this.removeChildNodes();
    return;
  }

  // if triangle can further divide, create further nodes and remove any linked polygon
  if (sideLength > Sierpinski.Graph.minSize) {

    this.removePolygon();
    this.reproduce();

    (function(childNodes, childCoords) {
      for (var i = 0; i < 3; i++) {
        childNodes[i].draw(childCoords[i].x, childCoords[i].y, childCoords[i].sideLength);
      }
    })(
      [this.firstChild, this.secondChild, this.thirdChild],
      Sierpinski.Trigonometry.getChildCoords(x, y, sideLength)
    );

  // if triangle is too small to further divide, remove child nodes if present and draw its polygon
  } else {

    this.removeChildNodes();
    this.drawPolygon(points);
  }
};

Sierpinski.TreeNode.prototype.drawPolygon = function(points) {
  /*
   * Adds an SVG polygin node for the current TreeNode
   * @param {Array} x,y coords for all three vertices of the triangle
   */
  if (!this.polygon) {
    this.polygon = document.createElementNS(Sierpinski.Graph.svgNS, 'polygon');
    this.polygon.setAttribute('style', 'fill:#669');
  }
  this.polygon.setAttribute('points',
    points[0].x + ',' + points[0].y + ' ' +
    points[1].x + ',' + points[1].y + ' ' +
    points[2].x + ',' + points[2].y
  );
  this.tree.container.appendChild(this.polygon);
};

Sierpinski.TreeNode.prototype.removePolygon = function() {
  /*
   * Removes the linked polygon node
   */
  if (this.polygon) {
    this.tree.container.removeChild(this.polygon);
    delete this.polygon;
  }
};

Sierpinski.TreeNode.prototype.removeChildNodes = function() {
  /*
   * Recursively removes and unlinks all the child nodes and any linked polygons
   */
  if (this.firstChild) {
    this.firstChild.removePolygon();
    this.firstChild.removeChildNodes();
    this.secondChild.removePolygon();
    this.secondChild.removeChildNodes();
    this.thirdChild.removePolygon();
    this.thirdChild.removeChildNodes();
    delete this.firstChild;
    delete this.secondChild;
    delete this.thirdChild;
  }
};


Sierpinski.Trigonometry = {

  translateCoords: function(centerX, centerY, sideLength) {
    /*
     * Take the coords of the centre of the triangle and returns coords of the bottom-left vertex
     * @param X coord of the centre of the triangle
     * @param Y coord of the centre of the triangle
     * @param Length of the side of the triangle
     */
    return {
      x: centerX - sideLength / 2,
      y: centerY + sideLength * Math.tan(Math.PI / 6) / 2,
      sideLength : sideLength
    };
  },

  getChildCoords: function(x, y, sideLength) {
    /*
     * Take the bottom-left vertex coords and side of a triangle and returns coords and side length of all three child triangles
     * @param X coord of the bottom-left vertex
     * @param Y coord of the bottom-left vertex
     * @param Length of the side of the triangle
     */
    return [{
      x: x + sideLength / 4,
      y: y - sideLength * Math.sin(Math.PI / 3) / 2,
      sideLength: sideLength / 2
    }, {
      x: x + sideLength / 2,
      y: y,
      sideLength: sideLength / 2
    }, {
      x: x,
      y: y,
      sideLength: sideLength / 2
    }];
  },

  getAllVertices: function(x, y, sideLength) {
    /*
     * Take the bottom-left vertex coords and side of a triangle and returns coords for all vertices
     * @param X coord of the bottom-left vertex
     * @param Y coord of the bottom-left vertex
     * @param Length of the side
     */
    return [{
      x: x + sideLength/2,
      y: y - sideLength * Math.sin(Math.PI / 3)
    }, {
      x: x + sideLength,
      y: y
    }, {
      x: x,
      y: y
    }];
  }

};
