let insertCounter = 1;
let counter = 1;
const objects = new Map();
const rightClipsIn = [];
const topClipsIn = [];
const leftClipsOut = [];
const botClipsOut = [];

const xmlns_ = "http://www.w3.org/2000/svg";
const margin_ = 25;
const borderSize_ = 2;
const highlightColor_ = "orange";

const blockColor_ = "#29abe2";
const blockTBClipAdjust_ = 17.5;
const blockTBClipX_ = 25;
const blockLRClipAdjust_ = 6;
const blockStartWidth_ = 100;
const blockStartHeight_ = 100;

const childrenY_ = blockStartHeight_ / 2 - 25;

const TBClipSize_ = 25;
const LRClipSize_ = 8;
const LRClipWidth_ = 14;

const slotStartWidth_ = 40;
const slotStartHeight_ = 50;

const insertColor_ = "#AF002A";

const opStartHeight_ = 30;
const opStartWidth_ = 25;
const opY_ = 10;
const opColor_ = "#e6e6e6";

const topClipMask = document.createElementNS(xmlns_, "rect");
setAttributes(topClipMask, {
  x: 0,
  y: 0,
  width: TBClipSize_,
  height: TBClipSize_,
  transform: "translate(25 0) rotate(-45)",
  fill: "black",
});

const rightClipMask = document.createElementNS(xmlns_, "circle");
setAttributes(rightClipMask, {
  cx: 0,
  cy: 0,
  r: LRClipSize_,
  fill: "black",
});

/** This SVG contains all created blocks and acts as a container.
 * @type {SVGElement}
 */
const container_ = document.createElementNS(xmlns_, "svg");
container_.setAttributeNS(null, "id", "container");
eventManager(container_);

/**
 * This function sets a SVGElement's attributes from an Object with the 'property: value' pairs desired.
 * @param {SVGElement} el - The SVG element.
 * @param {Object} attrs - The Object containing the desired values.
 */

function setAttributes(el, attrs) {
  Object.keys(attrs).forEach((k) => el.setAttributeNS(null, k, attrs[k]));
}

/* ********************************************************************* */
/* Data Structures - (Please keep new additions in alphabetical order!) */
/* ********************************************************************* */

/** Class representing a 'Block'
 * Blocks serve to connect logic chains together both by clicking together with {@link Clip|Clips} and with Pipes.
 * The internal logic of blocks is provided externally and assigned to a block via {@link setOperation|setOperation}.
 */

class Block {
  /**
   * @constructor
   * @param {string} id - Sets the block's ID (Must be unique).
   */
  constructor(id) {
    this.id = id;

    this.data = null;

    /**
     * This is the function that will be run when the block is executed.
     * @type {Function}
     */
    this.operation = null;

    this.parent = null;
    this.children = [];

    this.up = null;
    this.down = null;
    this.left = null;
    this.right = null;

    this.topClipIn = null;
    this.botClipOut = null;
    this.leftClipOut = null;
    this.rightClipIn = null;

    this.topClipMask = null;
    this.rightClipMask = null;

    this.mask = document.createElementNS(xmlns_, "mask");
    this.mask.setAttributeNS(null, "id", `${this.id}Mask`);

    const maskFill = document.createElementNS(xmlns_, "rect");
    setAttributes(maskFill, {
      fill: "white",
      x: "0",
      y: "0",
      width: "100%",
      height: "100%",
    });
    this.mask.appendChild(maskFill);

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      id: id,
      x: 0,
      y: 0,
      width: blockStartWidth_,
      height: blockStartHeight_,
      viewBox: `0 0 ${blockStartWidth_} ${blockStartHeight_}`,
    });

    this.svg.addEventListener(
      "mouseenter",
      this.highlightConnected.bind(this, "mouseenter", highlightColor_)
    );
    this.svg.addEventListener(
      "mouseleave",
      this.highlightConnected.bind(this, "mouseleave", "black")
    );

    this.g = document.createElementNS(xmlns_, "g");

    this.block = document.createElementNS(xmlns_, "rect");
    setAttributes(this.block, {
      class: "draggable",
      x: 0,
      y: 0,
      width: blockStartWidth_,
      height: blockStartHeight_,
      fill: blockColor_,
      mask: `url(#${this.id}Mask)`,
      style: `stroke: black; stroke-width: ${borderSize_}pt;`,
    });

    this.gChildren = document.createElementNS(xmlns_, "g");
    this.gChildren.setAttributeNS(
      null,
      "transform",
      `translate(0 ${childrenY_})`
    );

    this.g.appendChild(this.mask);
    this.g.appendChild(this.block);
    this.g.appendChild(this.gChildren);
    this.svg.appendChild(this.g);
  }

  /**
   * This function adds a {@link Clip|Clip} or an Object which contains the property 'svg' to the Block.
   * @param {Clip|Object} child - The Clip or Object containing a 'svg' property.
   */
  add(child) {
    if (child instanceof Clip) {
      child.addTo(this);
    } else {
      child.parent = this;
      this.gChildren.appendChild(child.svg);
      this.children.push(child);
    }

    this.fitChildren();
  }

  /**
   * This function runs the blocks {@link operation|operation}.
   */
  run() {
    if (this.operation != null) this.operation();
    if (this.right != null) this.right.run();
    if (this.down != null) this.down.run();
  }

  /**
   * This function sizes a block to fit all of its inner elements.
   */
  fitChildren() {
    let x = margin_;
    let y = 0;

    if (this.children.length === 0) {
      x = parseFloat(this.block.getAttributeNS(null, "width"));
      y = parseFloat(this.block.getAttributeNS(null, "height"));
    } else {
      for (const child of this.children) {
        child.svg.setAttributeNS(null, "x", x);
        x += parseFloat(child.svg.getAttributeNS(null, "width")) + margin_;
        const childHeight = parseFloat(
          child.svg.getAttributeNS(null, "height")
        );
        if (y < childHeight) y = childHeight;
      }
      y += childrenY_ + margin_;
    }

    if (x < blockStartWidth_) x = blockStartWidth_;
    if (y < blockStartWidth_) y = blockStartHeight_;

    this.setSize(x, y);

    if (this.parent != null) {
      this.parent.fitInserts();
      this.parent.parent.fitChildren();
    }
  }

  /**
   * This function sets the width and height of a block.
   * @param {number} newWidth - The new width.
   * @param {number} newHeight - The new height.
   */
  setSize(
    newWidth = parseFloat(this.block.getAttributeNS(null, "width")),
    newHeight = parseFloat(this.block.getAttributeNS(null, "height"))
  ) {
    this.block.setAttributeNS(null, "width", newWidth);
    this.block.setAttributeNS(null, "height", newHeight);

    if (this.leftClipOut != null && this.leftClipOut !== "disabled")
      newWidth += LRClipWidth_;
    if (this.botClipOut != null && this.botClipOut !== "disabled")
      newHeight += blockTBClipAdjust_;

    const newBox = `0 0 ${newWidth} ${newHeight}`;

    setAttributes(this.svg, {
      width: newWidth,
      height: newHeight,
      viewBox: newBox,
    });

    // clip positioning
    if (this.botClipOut != null && this.botClipOut !== "disabled") {
      this.botClipOut.svg.setAttributeNS(
        null,
        "transform",
        `translate(${blockTBClipX_} ${this.block.getAttributeNS(
          null,
          "height"
        )}) rotate(-45)`
      );
    }

    const width = parseFloat(this.block.getAttributeNS(null, "width"));
    const height = parseFloat(this.block.getAttributeNS(null, "height"));

    if (this.rightClipIn != null) {
      this.rightClipIn.svg.setAttributeNS(null, "x", width - LRClipWidth_);
      this.rightClipMask.setAttributeNS(
        null,
        "cx",
        width - blockLRClipAdjust_ + borderSize_ / 2
      );

      if (height < blockStartHeight_) {
        this.rightClipIn.svg.setAttributeNS(
          null,
          "y",
          height / 2 - LRClipSize_ - borderSize_ / 2
        );
        this.rightClipMask.setAttributeNS(null, "cy", height / 2);
      } else {
        this.rightClipIn.svg.setAttributeNS(
          null,
          "y",
          blockStartHeight_ / 2 - LRClipSize_ - borderSize_ / 2
        );
        this.rightClipMask.setAttributeNS(null, "cy", blockStartHeight_ / 2);
      }
    }

    if (this.leftClipOut != null && this.leftClipOut !== "disabled") {
      if (height < blockStartHeight_)
        this.leftClipOut.svg.setAttributeNS(
          null,
          "y",
          height / 2 - LRClipSize_ - borderSize_ / 2
        );
      else
        this.leftClipOut.svg.setAttributeNS(
          null,
          "y",
          blockStartHeight_ / 2 - LRClipSize_ - borderSize_ / 2
        );
    }

    setConnected(this);
  }

  /**
   * This function sets the color of the block.
   * @param {string} hexColor - A hexadecimal string specifying the color to fill the bllock with.
   */
  color(hexColor) {
    const isOk = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hexColor);
    if (isOk) {
      this.block.setAttributeNS(null, "fill", hexColor);
      if (this.leftClipOut != null && this.leftClipOut !== "disabled")
        this.leftClipOut.clip.setAttributeNS(null, "fill", hexColor);
      if (this.botClipOut != null && this.botClipOut !== "disabled")
        this.botClipOut.clip.setAttributeNS(null, "fill", hexColor);
    } else {
      console.log("invalid hex code!");
    }
  }

  /**
   * This function highlights a block.
   * @param {Object} selectedObj - The block to be highlighted.
   * @param {string} color - A hexadecimal string specifying the color of the highlight.
   */
  highlight(selectedObj, color) {
    selectedObj.block.setAttributeNS(
      null,
      "style",
      `stroke: ${color}; stroke-width: ${borderSize_}pt;`
    );
    if (
      selectedObj.leftClipOut != null &&
      selectedObj.leftClipOut !== "disabled"
    )
      selectedObj.leftClipOut.border.setAttributeNS(null, "stroke", color);
    if (selectedObj.botClipOut != null && selectedObj.botClipOut !== "disabled")
      selectedObj.botClipOut.border.setAttributeNS(null, "stroke", color);
    if (selectedObj.rightClipIn != null)
      selectedObj.rightClipIn.border.setAttributeNS(null, "stroke", color);
    if (selectedObj.topClipIn != null && selectedObj.topClipIn !== "disabled")
      selectedObj.topClipIn.border.setAttributeNS(null, "stroke", color);
  }

  /**
   * This function highlights this block and all connected blocks.
   * @param {Event} evt - A mouseover event.
   * @param {string} color - A hexadecimal string specifying the color of the highlight.
   */
  highlightConnected(evt, color) {
    this.highlight(this, color);

    if (evt === "mouseenter" && this.parent != null)
      this.parent.parent.highlightConnected(null, "black");

    if (evt === "mouseleave" && this.parent != null)
      this.parent.parent.highlightConnected(null, highlightColor_);

    let down = this.down;
    let right = this.right;

    while (right != null) {
      this.highlight(right, color);
      right = right.right;
    }

    while (down != null) {
      this.highlight(down, color);
      if (down.right != null) down.highlightConnected(null, color);
      down = down.down;
    }
  }

  /**
   * Sets the operation of the block.
   * @param {*} op - The operation that will be run when the block is executed.
   */
  setOperation(op) {
    this.operation = op;
  }
}

/** Class from which all Clips inherit. Clips are added to Blocks and allow them to physically attach to each other. */
class Clip {
  constructor() {
    this.svg = null;
    this.parent = null;
  }
}

/** Class representing the top inward facing clip. */
class TopClipIn extends Clip {
  constructor() {
    super();

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      x: 0,
      y: 0,
      width: TBClipSize_,
      height: TBClipSize_,
      viewBox: `0 0 ${TBClipSize_} ${TBClipSize_}`,
      transform: "translate(25 0) rotate(-45)",
    });

    this.clip = document.createElementNS(xmlns_, "rect");
    setAttributes(this.clip, {
      x: 0,
      y: 0,
      width: TBClipSize_,
      height: TBClipSize_,
      fill: "white",
      opacity: "0%",
    });

    this.border = document.createElementNS(xmlns_, "path");
    setAttributes(this.border, {
      d: "M 0 0 L 0 25 L 25 25",
      stroke: "black",
      "stroke-width": borderSize_,
      fill: "transparent",
    });

    this.svg.appendChild(this.clip);
    this.svg.appendChild(this.border);
  }

  /**
   * This adds the clip to a {@link Block|Block}. Each block may only have 1 of each clip and cannot have a Left clip and a Top/Down Clip.
   * @param {Block} obj - The Block to add the clip to.
   */
  addTo(obj) {
    if (obj.topClipIn != null) {
      console.log("clip already added or is disabled!");
    } else {
      obj.topClipIn = this;
      this.parent = obj;
      topClipsIn.push(this);
      obj.g.appendChild(obj.topClipIn.svg);
      obj.topClipMask = topClipMask.cloneNode();
      obj.mask.appendChild(obj.topClipMask);
      obj.leftClipOut = "disabled";
    }
  }
}

/** Class representing the bottom outward facing clip. */
class BotClipOut extends Clip {
  constructor() {
    super();

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      x: 0,
      y: 0,
      width: TBClipSize_,
      height: TBClipSize_,
      viewBox: `0 0 ${TBClipSize_} ${TBClipSize_}`,
    });

    this.clip = document.createElementNS(xmlns_, "rect");
    setAttributes(this.clip, {
      x: 0,
      y: 0,
      width: TBClipSize_,
      height: TBClipSize_,
      fill: blockColor_,
    });

    this.border = document.createElementNS(xmlns_, "path");
    setAttributes(this.border, {
      d: "M 0 0 L 0 25 L 25 25",
      stroke: "black",
      "stroke-width": borderSize_,
      fill: "transparent",
    });

    this.svg.appendChild(this.clip);
    this.svg.appendChild(this.border);
  }

  /**
   * This adds the clip to a {@link Block|Block}. Each block may only have 1 of each clip and cannot have a Left clip and a Top/Down Clip.
   * @param {Block} obj - The Block to add the clip to.
   */
  addTo(obj) {
    if (obj.botClipOut != null) {
      console.log("clip already added or is disabled!");
    } else {
      obj.botClipOut = this;
      this.parent = obj;
      botClipsOut.push(this);
      obj.g.appendChild(obj.botClipOut.svg);
      obj.leftClipOut = "disabled";
    }
  }
}

/** Class representing the left outward facing clip. */
class LeftClipOut extends Clip {
  constructor() {
    super();
    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      x: 0,
      y: 0,
      width: LRClipSize_ * 2 + borderSize_,
      height: LRClipSize_ * 2 + borderSize_,
      viewBox: `0 0 ${LRClipSize_ * 2 + borderSize_} ${
        LRClipSize_ * 2 + borderSize_
      }`,
    });

    this.clip = document.createElementNS(xmlns_, "circle");
    setAttributes(this.clip, {
      cx: 9,
      cy: 9,
      r: LRClipSize_,
      fill: blockColor_,
    });

    this.border = document.createElementNS(xmlns_, "path");
    setAttributes(this.border, {
      d: "M 14.5 15.5 A 8 8 0 1 1 14.5 2.5",
      stroke: "black",
      "stroke-width": borderSize_,
      fill: "transparent",
    });

    this.svg.appendChild(this.clip);
    this.svg.appendChild(this.border);
  }

  /**
   * This adds the clip to a {@link Block|Block}. Each block may only have 1 of each clip and cannot have a Left clip and a Top/Down Clip.
   * @param {Block} obj - The Block to add the clip to.
   */
  addTo(obj) {
    if (obj.leftClipOut != null) {
      console.log("clip already added or is disabled!");
    } else {
      obj.leftClipOut = this;
      this.parent = obj;
      leftClipsOut.push(this);
      this.svg.setAttributeNS(null, "x", -LRClipWidth_);
      this.clip.setAttributeNS(
        null,
        "fill",
        obj.block.getAttributeNS(null, "fill")
      );
      obj.g.setAttributeNS(null, "transform", `translate(${LRClipWidth_} 0)`);
      const newWidth =
        parseFloat(obj.svg.getAttributeNS(null, "width")) + LRClipWidth_;
      const newBox = `0 0 ${newWidth} ${obj.svg.getAttributeNS(
        null,
        "height"
      )}`;
      setAttributes(obj.svg, { width: newWidth, viewBox: newBox });
      obj.g.appendChild(obj.leftClipOut.svg);
      obj.topClipIn = "disabled";
      obj.botClipOut = "disabled";
    }
  }
}

/** Class representing the right inward facing clip. */
class RightClipIn extends Clip {
  constructor() {
    super();

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      x: 0,
      y: 0,
      width: LRClipSize_ * 2 + borderSize_,
      height: LRClipSize_ * 2 + borderSize_,
      viewBox: `0 0 ${LRClipSize_ * 2 + borderSize_} ${
        LRClipSize_ * 2 + borderSize_
      }`,
    });

    this.clip = document.createElementNS(xmlns_, "circle");
    setAttributes(this.clip, {
      cx: 9,
      cy: 9,
      r: LRClipSize_,
      fill: "f",
      opacity: "0%",
    });

    this.border = document.createElementNS(xmlns_, "path");
    setAttributes(this.border, {
      d: "M 14.5 15.5 A 8 8 0 1 1 14.5 2.5",
      stroke: "black",
      "stroke-width": borderSize_,
      fill: "transparent",
    });

    this.svg.appendChild(this.clip);
    this.svg.appendChild(this.border);
  }

  /**
   * This adds the clip to a {@link Block|Block}. Each block may only have 1 of each clip and cannot have a Left clip and a Top/Down Clip.
   * @param {Block} obj - The Block to add the clip to.
   */
  addTo(obj) {
    if (obj.rightClipIn != null) {
      console.log("clip already added or is disabled!");
    } else {
      obj.rightClipIn = this;
      this.parent = obj;
      rightClipsIn.push(obj.rightClipIn);
      obj.g.appendChild(obj.rightClipIn.svg);
      obj.rightClipMask = rightClipMask.cloneNode();
      obj.mask.appendChild(obj.rightClipMask);
    }
  }
}

/** Class representing the 'operators' which are placed inbetween two slots and execute an externally set operation upon them. */
class Operator {
  constructor() {
    this.parent = null;

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      y: opY_,
      width: opStartWidth_,
      height: opStartHeight_,
      viewBox: `0 0 ${opStartWidth_} ${opStartHeight_}`,
    });

    this.g = document.createElementNS(xmlns_, "g");

    this.block = document.createElementNS(xmlns_, "rect");
    setAttributes(this.block, {
      width: opStartWidth_,
      height: opStartHeight_,
      rx: 5,
      fill: opColor_,
    });

    this.g.appendChild(this.block);
    this.svg.appendChild(this.g);
  }
}

/** Class representing a 'slot' inside of a {@link Block|Block} which other blocks can be inserted into. */
class Slot {
  constructor() {
    this.parent = null;
    this.inserts = [];

    this.svg = document.createElementNS(xmlns_, "svg");
    setAttributes(this.svg, {
      width: slotStartWidth_ + LRClipWidth_,
      height: slotStartHeight_,
      viewBox: `0 0 ${slotStartWidth_ + LRClipWidth_} ${slotStartHeight_}`,
    });

    this.g = document.createElementNS(xmlns_, "g");

    this.block = document.createElementNS(xmlns_, "rect");
    setAttributes(this.block, {
      x: LRClipWidth_,
      width: slotStartWidth_,
      height: slotStartHeight_,
      fill: "#fff",
      style: `stroke: black; stroke-width: ${borderSize_}px;`,
    });

    this.rightClipIn = new LeftClipOut();
    this.rightClipIn.parent = this;
    rightClipsIn.push(this.rightClipIn);
    setAttributes(this.rightClipIn.svg, {
      x: 0,
      y: slotStartHeight_ / 2 - LRClipSize_,
    });
    this.rightClipIn.clip.setAttributeNS(null, "fill", "#fff");

    this.g.appendChild(this.block);
    this.g.appendChild(this.rightClipIn.svg);
    this.svg.appendChild(this.g);
  }

  /** This function sizes the Slot and its parent block to fit all inserted blocks. */
  fitInserts() {
    let x = 0;
    let y = 0;

    if (this.inserts.length === 0) {
      x = slotStartWidth_;
      y = slotStartHeight_;
    } else {
      for (const insert of this.inserts) {
        setAttributes(insert.svg, { x: x, y: 0 });
        x +=
          parseFloat(insert.svg.getAttributeNS(null, "width")) - LRClipWidth_;
        const insertHeight = parseFloat(
          insert.svg.getAttributeNS(null, "height")
        );
        if (y < insertHeight) y = insertHeight;
      }
    }

    this.setSize(x, y);

    this.parent.fitChildren();
    makeAllEqualHeight(this.parent);
  }

  /**
   * This function sets the width and height of the Slot.
   * @param {number} newWidth - The new width.
   * @param {number} newHeight - The new height.
   */
  setSize(
    newWidth = this.block.getAttributeNS(null, "width"),
    newHeight = this.block.getAttributeNS(null, "height")
  ) {
    this.block.setAttributeNS(null, "width", newWidth);
    this.block.setAttributeNS(null, "height", newHeight);

    newWidth += LRClipWidth_;

    const newBox = `0 0 ${newWidth} ${newHeight}`;

    setAttributes(this.svg, {
      width: newWidth,
      height: newHeight,
      viewBox: newBox,
    });

    const height = parseFloat(this.block.getAttributeNS(null, "height"));

    if (height < blockStartHeight_)
      this.rightClipIn.svg.setAttributeNS(null, "y", height / 2 - LRClipSize_);
    else
      this.rightClipIn.svg.setAttributeNS(
        null,
        "y",
        blockStartHeight_ / 2 - LRClipSize_
      );
  }

  /**
   * This function inserts a {@link Block|Block} into the slot.
   * @param {Block} insert - The Block to be inserted.
   */
  popIn(insert) {
    this.inserts.push(insert);
    insert.parent = this;

    if (insert.right !== null) this.popIn(insert.right);

    this.fitInserts();
    this.g.appendChild(insert.svg);
  }

  /**
   * This function removes a {@link Block|Block} from the slot.
   * @param {Block} insert - The Block to be removed.
   * @param {Object} offset - An Object with the X,Y offset of the parent block.
   */
  popOut(insert, offset) {
    this.getOffset(offset, insert);

    while (this.inserts.length !== 0) {
      const popped = this.inserts.pop();
      popped.parent = null;
      if (popped === insert) break;
    }

    this.fitInserts();
  }

  /**
   * This function adjusts the X,Y offset of the {@link Block|Block} to be removed.
   * @param {*} offset - The offset of the parent block.
   * @param {*} insert - The block to be removed.
   */
  getOffset(offset, insert) {
    for (const child of this.parent.children) {
      if (child === insert.parent) {
        offset.x -= margin_;
        break;
      } else
        offset.x -=
          margin_ + parseFloat(child.svg.getAttributeNS(null, "width"));
    }

    for (const child of this.inserts) {
      if (child === insert) break;
      else
        offset.x -=
          parseFloat(child.svg.getAttributeNS(null, "width")) - LRClipWidth_;
    }

    offset.y -= childrenY_;

    if (this.parent.parent != null)
      this.parent.parent.getOffset(offset, this.parent);
    else {
      offset.x -= parseFloat(this.parent.svg.getAttributeNS(null, "x"));
      offset.y -= parseFloat(this.parent.svg.getAttributeNS(null, "y"));
    }
  }
}

/** Class representing a text label which is added to a block. */
class Text {
  /**
   * @param {string} text - The text which will be displayed.
   */
  constructor(text) {
    this.parent = null;

    this.text = document.createElementNS(xmlns_, "text");
    this.text.textContent = text;

    this.svg = document.createElementNS(xmlns_, "svg");
    this.svg.appendChild(this.text);

    // svgs must be rendered before getBBox can be called
    document.getElementById("container").appendChild(this.svg);

    const bbox = this.text.getBBox();
    const width = bbox.width;
    const height = bbox.height;

    setAttributes(this.svg, {
      x: 0,
      y: 0,
      width: width,
      height: height,
      viewBox: `0 0 ${width} ${height}`,
    });
    setAttributes(this.text, { x: 0, y: height, fill: "#000" });
  }
}

/* ********************************************************************* */
/* Movement and Collision Systems - (Please keep new additions in alphabetical order!) */
/* ********************************************************************* */

/**
 * This function checks for collision on a {@link Block|Blocks} {@link Clip|Clips}.
 * @param {Block} block - The block being checked.
 */
function checkCollision(block) {
  if (block.botClipOut != null && block.botClipOut !== "disabled") {
    const x = block.botClipOut.svg.getBoundingClientRect().x;
    const y = block.botClipOut.svg.getBoundingClientRect().y;

    for (const clipIn of topClipsIn) {
      const cBox = clipIn.svg.getBoundingClientRect();
      const rangeX = cBox.width;
      const rangeY = cBox.height / 2;

      if (
        cBox.x > x - rangeX &&
        cBox.x < x + rangeX &&
        cBox.y > y - rangeY &&
        cBox.y < y + rangeY
      ) {
        resolveTBCollision(block, clipIn.parent);
        break;
      }
    }
  }

  if (block.topClipIn != null && block.topClipIn !== "disabled") {
    const x = block.topClipIn.svg.getBoundingClientRect().x;
    const y = block.topClipIn.svg.getBoundingClientRect().y;

    for (const clipOut of botClipsOut) {
      const cBox = clipOut.svg.getBoundingClientRect();
      const rangeX = cBox.width;
      const rangeY = cBox.height / 2;

      if (
        cBox.x > x - rangeX &&
        cBox.x < x + rangeX &&
        cBox.y > y - rangeY &&
        cBox.y < y + rangeY
      ) {
        resolveTBCollision(clipOut.parent, block);
        break;
      }
    }
  }

  if (block.rightClipIn != null) {
    const x = block.rightClipIn.svg.getBoundingClientRect().x;
    const y = block.rightClipIn.svg.getBoundingClientRect().y;

    for (const clipOut of leftClipsOut) {
      const cBox = clipOut.svg.getBoundingClientRect();
      const range = cBox.width;

      if (
        cBox.x > x - range &&
        cBox.x < x + range &&
        cBox.y > y - range &&
        cBox.y < y + range
      ) {
        resolveLRCollision(block, clipOut.parent);
        break;
      }
    }
  }

  if (block.leftClipOut != null && block.leftClipOut !== "disabled") {
    const x = block.leftClipOut.svg.getBoundingClientRect().x;
    const y = block.leftClipOut.svg.getBoundingClientRect().y;

    for (const clipIn of rightClipsIn) {
      const cBox = clipIn.svg.getBoundingClientRect();
      const range = cBox.width;

      if (
        cBox.x > x - range &&
        cBox.x < x + range &&
        cBox.y > y - range &&
        cBox.y < y + range
      ) {
        resolveLRCollision(clipIn.parent, block);
        break;
      }
    }
  }
}

/**
 * This function checks for collision on a {@link Block|Blocks} {@link Clip|Clips} and on all blocks it is connected to.
 * @param {Block} block - The origin block being checked.
 */
function checkAllCollision(block) {
  if (block != null) {
    checkCollision(block);

    let down = block.down;
    let right = block.right;

    while (down != null) {
      checkCollision(down);
      if (down.right != null) checkAllCollision(down);
      down = down.down;
    }

    while (right != null) {
      checkCollision(right);
      right = right.right;
    }
  }
}

/** This function attaches four event listeners which are attached to the {@link container_|container}:
 * -mousedown
 * -mousemove
 * -mouseup
 * -mouseleave
 */
function eventManager(svg) {
  /**
   * This function gets the current position of the mouse using CTM.
   * @param {Event} evt - A mousedown or mousemove event.
   */
  function getMousePosition(evt) {
    const CTM = svg.getScreenCTM();
    return {
      x: (evt.clientX - CTM.e) / CTM.a,
      y: (evt.clientY - CTM.f) / CTM.d,
    };
  }

  let selectedElement = null;
  let selectedObj = null;
  let offset = 0;

  /**
   * This function handles the mousedown event which starts a drag.
   * @param {Event} evt - A mousedown event.
   */
  function startDrag(evt) {
    if (evt.target.classList.contains("draggable")) {
      selectedElement = evt.target.parentNode.parentNode;
      selectedObj = objects.get(selectedElement.id);
      offset = getMousePosition(evt);

      if (selectedObj.parent instanceof Slot) {
        selectedObj.parent.popOut(selectedObj, offset);
      } else {
        offset.x -= parseFloat(selectedElement.getAttributeNS(null, "x"));
        offset.y -= parseFloat(selectedElement.getAttributeNS(null, "y"));
      }

      // disconnect block from chain
      if (selectedObj.up != null) selectedObj.up.down = null;
      if (selectedObj.left != null) {
        selectedObj.left.right = null;
        makeAllEqualHeight(selectedObj.left);
      }
      selectedObj.up = null;
      selectedObj.left = null;

      const coord = getMousePosition(evt);
      setAttributes(selectedElement, {
        x: coord.x - offset.x,
        y: coord.y - offset.y,
      });
      document.getElementById("container").appendChild(selectedElement);

      makeAllEqualHeight(selectedObj);
      frontLayerConnected(selectedObj);
    }
  }

  /**
   * This function handles the mousemove event which drags a selection.
   * @param {Event} evt - A mousemove event.
   */
  function drag(evt) {
    if (selectedElement) {
      evt.preventDefault();
      const coord = getMousePosition(evt);
      setAttributes(selectedElement, {
        x: coord.x - offset.x,
        y: coord.y - offset.y,
      });
      setConnected(selectedObj);
    }
  }

  /**
   * This function handles the mouseup or mouseleave event which ends a drag.
   * @param {Event} evt - A mouseup or mouseleave event.
   */
  function endDrag(evt) {
    if (selectedElement) {
      checkAllCollision(selectedObj);
      runChain(selectedObj);
      selectedElement = null;
    }
  }

  svg.addEventListener("mousedown", startDrag);
  svg.addEventListener("mousemove", drag);
  svg.addEventListener("mouseup", endDrag);
  svg.addEventListener("mouseleave", endDrag);
}

/**
 * This function re-appends a {@link Block|Block} and all attached blocks to the {@link container_|container} so they render on top of other visuals.
 * @param {Block} block - The origin block.
 */
function frontLayerConnected(block) {
  let down = block.down;
  let right = block.right;

  while (down != null) {
    document.getElementById("container").appendChild(down.svg);
    if (down.right != null) frontLayerConnected(down);
    down = down.down;
  }

  while (right != null) {
    document.getElementById("container").appendChild(right.svg);
    if (right.down != null) frontLayerConnected(right);
    right = right.right;
  }
}

/**
 * This function makes a {@link Block|Block} and all blocks connected to it left & right equal height.
 * @param {Block} block - The origin block.
 */
function makeAllEqualHeight(block) {
  block.fitChildren();

  let leftmost = block;
  let left = null;
  let right = null;
  let maxHeight = parseFloat(block.block.getAttributeNS(null, "height"));

  // make all blocks to left normal size
  if (block.left != null) left = block.left;

  while (left != null) {
    left.fitChildren();
    const height = parseFloat(left.block.getAttributeNS(null, "height"));
    if (height > maxHeight) maxHeight = height;
    if (left.left == null) leftmost = left;
    left = left.left;
  }

  // make all blocks to right normal size
  if (block.right != null) right = block.right;

  while (right != null) {
    right.fitChildren();
    const height = parseFloat(right.block.getAttributeNS(null, "height"));
    if (height > maxHeight) maxHeight = height;
    right = right.right;
  }

  // resize all blocks to be equal starting from leftmost
  left = leftmost;

  while (left.right != null) {
    left.setSize(undefined, maxHeight);
    left = left.right;
  }
  left.setSize(undefined, maxHeight);

  setConnected(leftmost);
}

/**
 * This function resolves a left & right clip collision between two {@link Block|Blocks} by connecting them.
 * @param {Block} left - The left block.
 * @param {Block} right - The right block.
 */
function resolveLRCollision(left, right) {
  if (left.right == null && right.left == null) {
    if (left.parent == null) {
      right.svg.setAttributeNS(
        null,
        "x",
        parseFloat(left.svg.getAttributeNS(null, "x")) +
          parseFloat(left.svg.getAttributeNS(null, "width")) -
          LRClipWidth_
      );
      right.svg.setAttributeNS(
        null,
        "y",
        parseFloat(left.svg.getAttributeNS(null, "y"))
      );

      left.right = right;
      right.left = left;

      makeAllEqualHeight(right);
      // setConnected(right);
    } else if (left instanceof Slot && left.inserts.length === 0) {
      left.popIn(right);
    } else if (left.parent instanceof Slot) {
      left.right = right;
      right.left = left;
      makeAllEqualHeight(right);
      left.parent.popIn(right);
    }
  }
}

/**
 * This function resolves a top & bottom clip collision between two {@link Block|Blocks} by connecting them.
 * @param {Block} top - The top block.
 * @param {Block} bot - The bottom block.
 */
function resolveTBCollision(top, bot) {
  if (top.bot == null && bot.top == null) {
    if ("leftClipOut" in top && !("leftClipOut" in bot)) {
      bot.svg.setAttributeNS(
        null,
        "x",
        parseFloat(top.svg.getAttributeNS(null, "x")) + LRClipWidth_
      );
    } else if ("leftClipOut" in bot && !("leftClipOut" in top)) {
      bot.svg.setAttributeNS(
        null,
        "x",
        parseFloat(top.svg.getAttributeNS(null, "x")) - LRClipWidth_
      );
    } else {
      bot.svg.setAttributeNS(null, "x", top.svg.getAttributeNS(null, "x"));
    }

    bot.svg.setAttributeNS(
      null,
      "y",
      parseFloat(top.svg.getAttributeNS(null, "y")) +
        parseFloat(top.block.getAttributeNS(null, "height"))
    );

    setConnected(bot);

    top.down = bot;
    bot.up = top;
  }
}

/**
 * This function runs the {@link operation|operations} of a chain of blocks.
 * @param {Block} block - The origin block.
 */
function runChain(block) {
  let left = block;
  while (left.left != null) left = left.left;
  while (left.up != null) left = left.up;
  left.run();
}

/**
 * This function re-aligns a {@link Block|Block's} connected blocks when moving or re-sizing.
 * @param {Block} block - The origin block.
 */
function setConnected(block) {
  if (block != null) {
    let down = block.down;
    let right = block.right;

    while (down != null) {
      setAttributes(down.svg, {
        x: parseFloat(down.up.svg.getAttributeNS(null, "x")),
        y:
          parseFloat(down.up.svg.getAttributeNS(null, "y")) +
          parseFloat(down.up.block.getAttributeNS(null, "height")),
      });
      if (down.right != null) setConnected(down);
      down = down.down;
    }

    while (right != null) {
      setAttributes(right.svg, {
        x:
          parseFloat(right.left.svg.getAttributeNS(null, "x")) +
          parseFloat(right.left.svg.getAttributeNS(null, "width")) -
          LRClipWidth_,
        y: parseFloat(right.left.svg.getAttributeNS(null, "y")),
      });
      right = right.right;
    }
  }
}

/* ********************************************************************* */
/* Buttons for testing code */
/* ********************************************************************* */

function createBlock() {
  objects.set(`block${counter}`, new Block(`block${counter}`));
  document
    .getElementById("container")
    .appendChild(objects.get(`block${counter}`).svg);
  counter++;
}

function createInsert() {
  const newInsert = new Block(`insert${insertCounter}`);
  objects.set(`insert${insertCounter}`, newInsert);
  newInsert.add(new LeftClipOut());
  newInsert.color(insertColor_);
  document
    .getElementById("container")
    .appendChild(objects.get(`insert${insertCounter}`).svg);
  insertCounter++;
}

function addSlot() {
  const last = Array.from(objects.values()).pop();
  last.add(new Slot());
}

function addOperator() {
  const last = Array.from(objects.values()).pop();
  last.add(new Operator());
}

function addTopClip() {
  const last = Array.from(objects.values()).pop();
  last.add(new TopClipIn());
}

function addBotClip() {
  const last = Array.from(objects.values()).pop();
  last.add(new BotClipOut());
}

function addLeftClip() {
  const last = Array.from(objects.values()).pop();
  last.add(new LeftClipOut());
}

function addRightClip() {
  const last = Array.from(objects.values()).pop();
  last.add(new RightClipIn());
}

function logBlock() {
  // var last = Array.from(objects.values()).pop();
  console.log(Array.from(objects.values()));
}

window.document.getElementById("createBlock").onclick = createBlock;
window.document.getElementById("createInsert").onclick = createInsert;
window.document.getElementById("addSlot").onclick = addSlot;
window.document.getElementById("addOperator").onclick = addOperator;
window.document.getElementById("addTopClip").onclick = addTopClip;
window.document.getElementById("addBotClip").onclick = addBotClip;
window.document.getElementById("addLeftClip").onclick = addLeftClip;
window.document.getElementById("addRightClip").onclick = addRightClip;
window.document.getElementById("logBlock").onclick = logBlock;

/**
 * This function appends the {@link container_|container} to a <div> element.
 * @param {*} divId - The div element.
 */
function setWorkArea(divId) {
  const workArea = document.getElementById(divId);
  workArea.appendChild(container_);
}

window.onload = function () {
  setWorkArea("workArea");
};
