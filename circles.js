/* HOW THIS WORKS
    * The canvas has a variable size, depending on css and user setup
    * TODO Document more ...

*/

// Different Drawing modes
const DRAWING_MODE_CIRCLES = 1;
const DRAWING_MODE_SQUARES = 2;
var drawing_mode_current = 1;

// Different Interaction modes
const INTERACTION_MODE_SPLIT = 1;
const INTERACTION_MODE_MERGE = 2;

var logging = false; // Enable logging to the console

var max_depth = 7; // Maximum count of horizontal circles
var bC = "#202020";

var mousedown_left = false; // If the left moused button was pressed, but not released yet

var img; // The main Image object

var cc; // The main canvas
var cc2; // 2d context of main canvas
var osc; // Off screen canvas
var osc2; // Off screen canvas 2d contex

var bc; // Backgound Canvas
var bc2; // Background Canvas 2d context

var cd; // div containg the canvas
var scale = 1; // Linear factor describing the scale of displayed image to source image
var i_scale = 1; // Inverse of scale

var treeJS = new TreeModel(); // Cirlces tree data structure
var root; // The root node of the tree data structure
var ln = null; // last selected node

var dI = false; // If the image is drawed in the Background


document.addEventListener("DOMContentLoaded", function(event) {
    initializeCirclesCanvas();
    resetCirclesStructure();
    setNewImage("https://wallpapers.wallhaven.cc/wallpapers/full/wallhaven-218355.jpg");
    setupControls();

    window.addEventListener("resize", function() {
        calculateScale();
        drawBackground();
        redrawCircles();
    });
});

/**
    * Register all requiered objects and event listeners
    * This function needs to run once the page is loaded
**/
function initializeCirclesCanvas() {
    cd = document.getElementById("circles_canvas_container");
    osc = document.createElement("canvas");
    osc2 = osc.getContext("2d");

    cc = document.getElementById("circles_canvas");
    cc2 = cc.getContext("2d");

    // Create a secondary canvas only for the background
    // When only the background changes, there is no need to redraw the complete node tree
    bc = document.createElement("canvas");
    bc.style.position = "absolute";
    bc.style.backgroundcolor = "transparent";
    bc.style.top = "0px";
    bc.style.left = "0px";
    bc.style.zIndex = "4";
    bc2 = bc.getContext("2d");
    cd.insertBefore(bc, cc);

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){ toggleBackground();}
    };

    cc.addEventListener("mousemove", onCirclesInputHover);
    cc.addEventListener("click", onCirclesInputClick);
    cc.addEventListener("mousedown", function(event) {
        if (event.which == 1) {
            mousedown_left = true;
        }
    });
    cc.addEventListener("mouseup", function(event) {
        if (event.which == 1) {
            mousedown_left = false;
        }
    });
    cc.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        onCirclesInputClick(event);
    });
}

/**
    * Calculate the factor to scale the image to the size of our canvas container at max.
    * Do not rescale if image dimensions are smaller than the canvas div.
**/
function calculateScale() {
    if (osc.width > cd.clientWidth) {
        cc.width = cd.clientWidth;
        scale = (osc.width / cd.clientWidth);
        i_scale = (1/scale);
        cc.height = osc.height * i_scale;
    } else {
        cc.width = osc.width;
        cc.height = osc.height;
        scale = 1;
        i_scale = 1;
    }

    bc.width = cc.width;
    bc.height = cc.height;
}

/**
    * Load new image for pixelation.
    * Redraws the current node tree structure for the new image.
    * Only CORS enabled hosters are supported.
    * @param {url} url - The identifier for the image ressource to load
**/
function setNewImage(url) {
    img = new Image();
    img.crossOrigin = "";
    img.src = url;

    img.onload = function() {
        osc.width = img.naturalWidth;
        osc.height = img.naturalHeight;
        osc2.drawImage(img, 0, 0);
        calculateScale();
        drawBackground();
        redrawCircles();
    };
}

/**
    * Create the default tree structure (one single root node).
**/
function resetCirclesStructure() {
    root = treeJS.parse({name: "0", children: []});
}

/**
    * Create a node tree where all visibile nodes have maximum depth
**/
function setFullSpreadTree() {
    // TODO Proper Memory Management
    root = treeJS.parse({name: "0", children: []});
    addEvenChildren(root, max_depth);
}

/**
    * Recursively adds 4 child nodes to the given node.
    * @param {Node} parent - The node to append new child nodes to
    * @param {Number} depth - Depth of the recursion
**/
function addEvenChildren(parent, depth) {
    if (depth <= 0) {
        return;
    }
    for (let i = 1; i < 5; i++) {
        let newLeaf = treeJS.parse({name: parent.model.name + i, children: []});
        parent.addChild(newLeaf);

        addEvenChildren(newLeaf, depth-1);
    }
}

/**
    * Removes all child nodes of a node recursively.
    * @param {Node} parent - The corresponding node to edit
**/
function removeAllChildren(parent) {
    // TODO Proper Memory Management
    parent.children = [];
    return;
}

/**
    * Draw the background to the canvas.
    * If dI is set, draws the image itself, else a gray surface.
    * This overwrites all other pixels currently present.
    * If no dimensions are provided, redraws the complete canvas background.
    * @param {Array} pos_top_left - [X,Y] coordinates of top left corner of requested redraw
    * @param {Array} size - [width, height] of the background starting from pos_top_left
**/
function drawBackground(pos_top_left, size) {
    if (pos_top_left == undefined || size == undefined) {
        pos_top_left = [0, 0]; size = [cc.width, cc.height];
    }
    if (dI) {
        bc2.drawImage(img, pos_top_left[0] * scale, pos_top_left[1] * scale, size[0] * scale, size[1] * scale, pos_top_left[0], pos_top_left[1], size[0], size[1]);
    } else {
        bc2.fillStyle = bC;
        bc2.fillRect(pos_top_left[0], pos_top_left[1], size[0], size[1]);
    }
}

/**
    * Swap Image Backgound and gray background.
**/
function toggleBackground() {
    dI = !dI;
    drawBackground();
}

function onCirclesInputHover(event) {
    if (mousedown_left) {
        onCirclesInputClick(event);
    }
}

function onCirclesInputClick(event) {
    if (event.button == 2) {
        var node = updateTree(event, INTERACTION_MODE_MERGE);
    } else {
        var node = updateTree(event, INTERACTION_MODE_SPLIT);
    }

    if (node != null) {
        redrawCircles(node);
    }
}
/**
    * Processes user input on the canvas.
    * Adds new subcirlce nodes to the tree model or removes the nodes and all its siblings.
    * Does NOT draw the changes on the canvas.
    * @param {event} event - The user input event (mouse or touch)
    * @param {INTERACTION_MODE} interactionMode - How to update - Split or Merge
    * @return {node} The node (subtree) that changed, null if nothing changed
**/
function updateTree(event, interactionMode) {
    // Get relative position in displayed image space
    var x_rel = event.offsetX;
    var y_rel = event.offsetY;
    // Transform to global position in unaltered source image
    var x_abs = scale * x_rel;
    var y_abs = scale * y_rel;

    // Find the leaf node which covers this position
    var leaf = getClosestLeaf([x_abs, y_abs]);
    // Only redraw if something changed
    if (leaf == ln || leaf == null) {
        log("Nothing changed, no redraw.");
        return null;
    }

    if (leaf.hasChildren()) {
        log("Something DRASTICALLY went wrong!!!");
    }

    // Change behaviour based on selected interaction method
    switch (interactionMode) {
        case INTERACTION_MODE_SPLIT:
            // Do not split when allready at max tree depth
            if (leaf.model.name.length > max_depth) {
                return;
            }
            // Add four new child nodes
            addEvenChildren(leaf, 1);
            // Remember last updated leaf
            ln = leaf;
            break;
        case INTERACTION_MODE_MERGE:
            leaf = leaf.parent != undefined ? leaf.parent : leaf;
            removeAllChildren(leaf);
            ln = null;
            break;
    }
    return leaf;
}

/**
    * Redraws the node tree.
    * If no start node is provided, redraws the complete tree.
    * @param {Node} startNode - The node sub tree to redraw
**/
function redrawCircles(startNode) {
    if (startNode == undefined) {
        startNode = root;
        cc2.clearRect(0, 0, cc.width, cc.height);
    } else if (drawing_mode_current != DRAWING_MODE_SQUARES) {
        // There is no need to clear as we are covering the complete area when using squares
        let pos = getCanvasPos(startNode.model.name);
        let r = getRadius(startNode.model.name.length);
        cc2.clearRect(pos[0] - r, pos[1] - r, r * 2, r * 2);
    }
    startNode.walk(function(node) {
        if (!node.hasChildren()) {

            var pos = getCanvasPos(node.model.name);
            var r = getRadius(node.model.name.length);

            // Get color data from original image
            var col = osc2.getImageData(pos[0] * scale, pos[1] * scale, 1, 1).data;
            cc2.fillStyle = "rgba("+ col[0] + "," + col[1] + "," + col[2] + "," + col[3] + ")";

            // And draw the desired object
            switch (drawing_mode_current) {
                case DRAWING_MODE_CIRCLES:
                    cc2.beginPath();
                    cc2.arc(pos[0], pos[1], r , 0, 2 * Math.PI);
                    cc2.fill();
                    break;
                case DRAWING_MODE_SQUARES:
                    cc2.fillRect(pos[0] - r, pos[1] - r, r * 2, r * 2);
                    break;
                default:
                    cc2.font = "30px Arial";
                    cc2.fillText("No valid drawing mode set!",10,50);
                    break;
            }
        }
    });
}

/**
    * Determines the radius of a node
    * @param {Number} circle_ID_length - The length of the id (name proprty) of the node
    * @return {Number} The radius of the nodes pixel representation
**/
function getRadius(circle_ID_length) {
    // Do not draw elements smaller than pixel size - Radius is at least 0.5 pixel
    return Math.max(0.5, Math.min(cc.width, cc.height) * Math.pow(2, -circle_ID_length));
}

/**
    * Determines the position of a node (the circle´s center).
    * @param {String} circle_ID - The id (name proprty) of the node
    * @return {Array} [X,Y] Coordinates of the node
**/
function getCanvasPos(circle_ID) {
    circle_ID = circle_ID.slice(1);
    var pos_x = cc.width * 0.5;
    var pos_y = cc.height * 0.5;
    for (let i = 0; i < circle_ID.length; i++) {
        var r = getRadius(i+2);
        switch (circle_ID[i]) {
            case "1":
                pos_x -= r;
                pos_y -= r;
                break;
            case "2":
                pos_x += r;
                pos_y -= r;
                break;
            case "3":
                pos_x += r;
                pos_y += r;
                break;
            case "4":
                pos_x -= r;
                pos_y += r;
                break;
            default:
                log("Error during getCanvasPos!");
        }
    }
    return [pos_x, pos_y];
}

/**
    * Determines the leaf of the node tree which covers a certain position.
    * @param {Array} position - [X,Y] Position
    * @return {Node} The closest node
**/
function getClosestLeaf(position) {
    var current_node = root;
    var current_depth = 0;
    while (current_node.hasChildren()) {

        // Limit maximum depth
        current_depth++;
        if (current_depth > max_depth) {
            return null;
        }

        node_pos = getCanvasPos(current_node.model.name);
        node_pos[0] *= scale;
        node_pos[1] *= scale;
        // Find the right quadrant
        var q = "";
        if (position[0] < node_pos[0] && position[1] < node_pos[1]) {
            q = "1";
        } else if (position[0] > node_pos[0] && position[1] < node_pos[1]) {
            q = "2";
        } else if (position[0] > node_pos[0] && position[1] > node_pos[1]) {
            q = "3";
        } else if (position[0] < node_pos[0] && position[1] > node_pos[1]) {
            q = "4";
        }

        current_node = root.first(function(node) {
            return node.model.name == (current_node.model.name + q);
        });
    }

    return current_node;
}

/**
    * Register Callbacks for user interaction on button press.
**/
function setupControls() {
    document.getElementById("b_circles_reset").addEventListener("click", function() {
        resetCirclesStructure();
        redrawCircles();
    });
    document.getElementById("b_circles_setImageURL").addEventListener("click", function() {
        setNewImage(this.form.elements[0].value);
    });
    document.getElementById("b_circles_toggle_background").addEventListener("click", toggleBackground);
    document.getElementById("b_circles_set_depth").addEventListener("click", function() {
        max_depth = this.form.elements[0].value;
    });
    document.getElementById("b_circles_setBColor").addEventListener("click", function() {
        bC = this.form.elements[0].value;
        drawBackground();
    });
    document.getElementById("b_circles_setImageFile").addEventListener("click", function() {
        img_file = this.form.elements[0].files[0];
        setNewImage(URL.createObjectURL(img_file));
    });
    document.getElementById("b_circles_draw_mode").addEventListener("click", function() {
        drawing_mode_current == DRAWING_MODE_CIRCLES ? drawing_mode_current = DRAWING_MODE_SQUARES : drawing_mode_current = DRAWING_MODE_CIRCLES;
        redrawCircles();
    });
    document.getElementById("b_circles_apply_max_depth").addEventListener("click", function() {
        setFullSpreadTree();
        redrawCircles();
    });
}

/**
    * Conditioned Logging wrapper.
**/
function log(what) {
    if (logging) {
        console.log(what);
    }
}
