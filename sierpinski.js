       //
     //1//
   //    //
 //3/////2//


$(function() {

  Graph.init($(window).width(), $(window).height());
  Graph.draw();

  var drawTimer;
  var panStart = {};

  $(document).on('wheel', function(e) {
    e.preventDefault();
    if (drawTimer) {
      window.clearTimeout(drawTimer);
    }
    drawTimer = window.setTimeout(function() {
      Graph.draw();
    }, 100);
    Graph.zoom(-e.originalEvent.deltaY, {x: e.originalEvent.clientX, y: e.originalEvent.clientY});
  });

  $(document).on('dblclick', function(e) {
    e.preventDefault();
    Graph.zoom(1000, {x: e.clientX, y: e.clientY});
    Graph.draw();
  });


  $(document).on('mousedown', function(e) {
    e.preventDefault();
    panStart = {x: e.clientX, y: e.clientY};
  });

  $(document).on('mousemove', function(e) {
    e.preventDefault();
    if ('x' in panStart) {
      Graph.pan({x: e.clientX - panStart.x, y: e.clientY - panStart.y});
    }
  });

  $(document).on('mouseup', function(e) {
    e.preventDefault();
    panStart = {};
    Graph.draw();
  });
});


var Graph = {

  zoomSpeed     : 10,
  initialDepth  : 6,
  bufferSize    : 0.7,
  svgNS         : 'http://www.w3.org/2000/svg',

  init: function(width, height) {

    this.width                = width;
    this.height               = height;
    this.sideLength           = Math.min(this.height * 0.6, this.width * 0.6);                // initial side length of the root triangle
    this.offset               = {x: this.width/2, y: this.height/2};                          // in the beginning, draw in the middle
    this.minSize              = Math.ceil(this.sideLength / Math.pow(2, this.initialDepth));  // min side length required to split a triangle
    this.immediateZoomFactor  = 1;
    this.finalZoomFactor      = 1;

    this.initSierpinski();
  },

  initSierpinski: function () {

    this.svg = document.body.appendChild(document.createElementNS(this.svgNS, 'svg'));
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);

    this.tree = new SierpinskiTree(this.svg.appendChild(document.createElementNS(Graph.svgNS, 'g')));
  },

  draw: function() {

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

    // zoom grows everytime
    this.immediateZoomFactor = this.immediateZoomFactor * (1 + (delta * this.zoomSpeed)/10000);

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
  },

  pan: function(coords) {
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


function SierpinskiTree(container) {
  this.container = container;
  this.root = new SierpinskiTreeNode();
  this.root.tree = this;
};

SierpinskiTree.prototype.draw = function(centerX, centerY, sideLength) {
  this.root.draw(centerX - sideLength / 2, centerY + sideLength * Math.tan(Math.PI / 6) / 2, sideLength);
};


var SierpinskiTreeNode = function(parent, depth) {
  this.depth            = depth || (parent ? parent.depth + 1 : 0);
  this.tree             = parent ? parent.tree : null;
  this.firstChild       = false;
  this.nextSibling      = false;
  this.previousSibling  = false;
};

SierpinskiTreeNode.prototype.after = function(node) {
  this.nextSibling = node;
  node.previousSibling = this;
  return this.nextSibling;
};

SierpinskiTreeNode.prototype.countNodes = function() {
  var count = 1;
  if (this.firstChild) {
    count = count + this.firstChild.countNodes();
    count = count + this.firstChild.nextSibling.countNodes();
    count = count + this.firstChild.previousSibling.countNodes();
  }
  return count;
};

SierpinskiTreeNode.prototype.getDepth = function() {
  if (this.firstChild) {
    return Math.max(this.firstChild.getDepth(), this.firstChild.nextSibling.getDepth(), this.firstChild.previousSibling.getDepth());
  }
  return this.depth;
};

SierpinskiTreeNode.prototype.reproduce = function() {

  if (!this.firstChild) {
    this.firstChild = new SierpinskiTreeNode(this);
    this.firstChild.after(new SierpinskiTreeNode(this)).after(new SierpinskiTreeNode(this)).after(this.firstChild);
  }
};

SierpinskiTreeNode.prototype.draw = function(x, y, sideLength) {
/*
 * Recursively draws a triangle node
 * x: X coord of the bottom left corner 
 * y: Y coord of the bottom left corner
 * sideLength: Length of the side of the triangle
 */

  var points = this.getPoints(x, y, sideLength);

  // if the node is outisde the visible and the buffered area, remove it to avoid unwanted recursion
  var bufX = Graph.width * Graph.bufferSize;
  var bufY = Graph.height * Graph.bufferSize;
  if (
    (points[0].x <= -bufX && points[1].x <= -bufX && points[2].x <= -bufX) ||
    (points[0].y <= -bufY && points[1].y <= -bufY && points[2].y <= -bufY) ||
    (points[0].x > Graph.width + bufX && points[1].x > Graph.width + bufX && points[2].x > Graph.width + bufX) ||
    (points[0].y > Graph.height + bufY && points[1].y > Graph.height + bufY && points[2].y > Graph.height + bufY)
  ) {
    this.removePolygon();
    this.removeChildNodes();
    return;
  }

  // if triangle can further divide, create further nodes and remove any linked polygon
  if (sideLength > Graph.minSize) {

    this.removePolygon();
    this.reproduce();

    this.firstChild.draw(x + sideLength / 4, y - sideLength * Math.sin(Math.PI / 3) / 2, sideLength / 2);
    this.firstChild.nextSibling.draw(x + sideLength / 2, y, sideLength / 2);
    this.firstChild.previousSibling.draw(x, y, sideLength / 2);

  // if triangle is too small to further divide, remove child nodes if present and draw its polygon
  } else {

    this.removeChildNodes();
    this.drawPolygon(points);
  }
};

SierpinskiTreeNode.prototype.getPoints = function(x, y, sideLength) {
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
};

SierpinskiTreeNode.prototype.drawPolygon = function(points) {
  if (!this.polygon) {
    this.polygon = document.createElementNS(Graph.svgNS, 'polygon');
    this.polygon.setAttribute('style', 'fill:#669');
  }
  this.polygon.setAttribute('points',
    points[0].x + ',' + points[0].y + ' ' +
    points[1].x + ',' + points[1].y + ' ' +
    points[2].x + ',' + points[2].y
  );
  this.tree.container.appendChild(this.polygon);
};

SierpinskiTreeNode.prototype.removePolygon = function() {
  if (this.polygon) {
    this.tree.container.removeChild(this.polygon);
    delete this.polygon;
  }
};

SierpinskiTreeNode.prototype.removeChildNodes = function() {
  if (this.firstChild) {
    this.firstChild.clear();
    delete this.firstChild;
  }
};

SierpinskiTreeNode.prototype.clear = function() {
  this.removePolygon();
  if (this.nextSibling) {
    var next = this.nextSibling;
    delete this.nextSibling;
    delete next.previousSibling;
    next.clear();
  }
  if (this.firstChild) {
    var child = this.firstChild;
    delete this.firstChild;
    child.clear();
  }
};
