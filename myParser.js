// parsing the boxes from the arrayBuffer
var ISOBoxer = {};
ISOBoxer.parseBuffer = function(arrayBuffer){
    return new ISOFile(arrayBuffer).parse();
};
ISOBoxer.Cursor = function (initialOffset) {
    this.offset = ( typeof initialOffset == 'undefined' ? 0 : initialOffset);
}

var ISOFile = function (arrayBuffer){
    this._cursor = new ISOBoxer.Cursor();
    this.boxes = [];
    if(arrayBuffer) {
        this._raw = new DataView(arrayBuffer);
    } 
};
ISOFile.prototype.parse = function(){
    this._cursor.offset = 0;
    this.boxes = [];
    while (this._cursor.offset < this._raw.byteLength) {
        var box = ISOBox.parse(this);
        //Box could not be parsed
        if (typeof box.type === 'undefined') break;
        this.boxes.push(box);
    }
    return this;
};

var ISOBox = function() {
    this._cursor = new ISOBoxer.Cursor();
};
ISOBox.parse = function(parent) {
    var newBox = new ISOBox();
    newBox._offset = parent._cursor.offset;
    newBox._root = (parent._root ? parent._root : parent);
    newBox._raw = parent._raw;
    newBox._parent = parent;
    newBox._parseBox();
    parent._cursor.offset = newBox._raw.byteOffset + newBox._raw.byteLength;

    if (newBox.type == 'mdat') {
        var parser, xmlDoc, parsedXml, smtpeNameSpace, imageList;
        xmlDoc = ISOBoxer.Utils.dataViewToString(newBox.data);
        console.log("Content of mddat box is:" + xmlDoc);
        parser = new DOMParser();
        parsedXml = parser.parseFromString(xmlDoc, "text/xml");
        smtpeNameSpace = "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt";
        imageList = parsedXml.getElementsByTagNameNS(smtpeNameSpace, "image");
        for (var i = 0; i < imageList.length; i++) {
            var img = document.createElement("img");
            var imgParent = document.getElementById('body');
            img.id = "id" + i;
            img.className = "smpte_image";
            img.src = "data:image/png;base64," + imageList[i].innerHTML;
            imgParent.appendChild(img);
        }
    } else {
        console.log("Found box of type " + newBox.type + " and size " + newBox.size);
    }

    return newBox;
};

ISOBox.prototype._parseBox = function(){
    this._parsing = true;
    this._cursor.offset = 0;

    //return immediately if no enough bytes to read the header
    if(this._offset + 8 > this._raw.buffer.byteLength) {
        this.root._incomplete = true;
        return;
    }

    this._procField('size', 'uint', 32);
    this._procField('type', 'string', 4);

    if (this.size === 1) {
        this._procField('largesize', 'uint', 64);
    }
    if (this.type === 'uuid') {
        this._procFieldArray('usertype', 16, 'uint', 8);
    }

    switch (this.size) {
        case 0:
            this._raw = new DataView(this._raw.buffer, this._offset, (this._raw.byteLength - this._cursor.offset + 8));
            break;
        case 1:
            if (this._offset + this.size > this._raw.buffer.byteLength) {
                this._incomplete = true;
                this._root._incomplete = true;
            } else {
                this._raw = new DataView(this._raw.buffer, this._offset, this.largesize);
            }
            break;
        default:
            if (this._offset + this.size > this._raw.buffer.byteLength) {
                this._incomplete = true;
                this._root._incomplete = true;
            } else {
                this._raw = new DataView(this._raw.buffer, this._offset, this.size);
            }
    }

    // additional parsing
    if (!this._incomplete) {
        if (this._boxProcessors[this.type]) {
            this._boxProcessors[this.type].call(this);
        }
        if (this._boxContainers.indexOf(this.type) !== -1) {
            this._parseContainerBox();
        } else {
            // Unknown box => read and store box content
            this._data = this._readData();
        }
    }
}

// Generic read/write functions
ISOBox.prototype._procField = function (name, type, size) {
    if (this._parsing) {
        this[name] = this._readField(type, size);
    } else {
        this._writeField(type, size, this[name]);
    }
};

ISOBox.prototype._procFieldArray = function (name, length, type, size) {
    var i;
    if (this._parsing) {
        this[name] = [];
        for (i = 0; i < length; i++) {
            this[name][i] = this._readField(type, size);
        }
    } else {
        for (i = 0; i < this[name].length; i++) {
            this._writeField(type, size, this[name][i]);
        }
    }
};

ISOBox.prototype._procFullBox = function () {
    this._procField('version', 'uint', 8);
    this._procField('flags', 'uint', 24);
};

ISOBox.prototype._parseContainerBox = function () {
    this.boxes = [];
    while (this._cursor.offset - this._raw.byteOffset < this._raw.byteLength) {
        this.boxes.push(ISOBox.parse(this));
    }
};

ISOBox.prototype._boxContainers = ['moof','traf'];

ISOBox.prototype._boxProcessors = {};

ISOBox.prototype._boxProcessors['mfhd'] = function () {
    this._procFullBox();
    this._procField('sequence_number', 'uint', 32);
};

ISOBox.prototype._boxProcessors['tfhd'] = function () {
    this._procFullBox();
    this._procField('track_ID', 'uint', 32);
    if (this.flags & 0x01) this._procField('base_data_offset', 'uint', 64);
    if (this.flags & 0x02) this._procField('sample_description_offset', 'uint', 32);
    if (this.flags & 0x08) this._procField('default_sample_duration', 'uint', 32);
    if (this.flags & 0x10) this._procField('default_sample_size', 'uint', 32);
    if (this.flags & 0x20) this._procField('default_sample_flags', 'uint', 32);
};

ISOBox.prototype._boxProcessors['trun'] = function () {
    this._procFullBox();
    this._procField('sample_count', 'uint', 32);
    if (this.flags & 0x1) this._procField('data_offset', 'int', 32);
    if (this.flags & 0x4) this._procField('first_sample_flags', 'uint', 32);
    this._procEntries('samples', this.sample_count, function (sample) {
        if (this.flags & 0x100) this._procEntryField(sample, 'sample_duration', 'uint', 32);
        if (this.flags & 0x200) this._procEntryField(sample, 'sample_size', 'uint', 32);
        if (this.flags & 0x400) this._procEntryField(sample, 'sample_flags', 'uint', 32);
        if (this.flags & 0x800) this._procEntryField(sample, 'sample_composition_time_offset', (this.version === 1) ? 'int' : 'uint', 32);
    });
};

ISOBox.prototype._boxProcessors['mdat'] = function () {
    this._procField('data', 'data', -1);
};

//read and parse functions
ISOBox.prototype._readField = function (type, size) {
    switch (type) {
        case 'uint':
            return this._readUint(size);
        case 'int':
            return this._readInt(size);
        case 'template':
            return this._readTemplate(size);
        case 'string':
            return (size === -1) ? this._readTerminatedString() : this._readString(size);
        case 'data':
            return this._readData(size);
        case 'utf8':
            return this._readUTF8String();
        default:
            return -1;
    }
};

ISOBox.prototype._readInt = function (size) {
    var result = null,
        offset = this._cursor.offset - this._raw.byteOffset;
    switch (size) {
        case 8:
            result = this._raw.getInt8(offset);
            break;
        case 16:
            result = this._raw.getInt16(offset);
            break;
        case 32:
            result = this._raw.getInt32(offset);
            break;
        case 64:
            // Warning: JavaScript cannot handle 64-bit integers natively.
            // This will give unexpected results for integers >= 2^53
            var s1 = this._raw.getInt32(offset);
            var s2 = this._raw.getInt32(offset + 4);
            result = (s1 * Math.pow(2, 32)) + s2;
            break;
    }
    this._cursor.offset += (size >> 3);
    return result;
};

ISOBox.prototype._readUint = function (size) {
    var result = null,
        offset = this._cursor.offset - this._raw.byteOffset,
        s1, s2;
    switch (size) {
        case 8:
            result = this._raw.getUint8(offset);
            break;
        case 16:
            result = this._raw.getUint16(offset);
            break;
        case 24:
            s1 = this._raw.getUint16(offset);
            s2 = this._raw.getUint8(offset + 2);
            result = (s1 << 8) + s2;
            break;
        case 32:
            result = this._raw.getUint32(offset);
            break;
        case 64:
            // Warning: JavaScript cannot handle 64-bit integers natively.
            // This will give unexpected results for integers >= 2^53
            s1 = this._raw.getUint32(offset);
            s2 = this._raw.getUint32(offset + 4);
            result = (s1 * Math.pow(2, 32)) + s2;
            break;
    }
    this._cursor.offset += (size >> 3);
    return result;
};

ISOBox.prototype._readString = function (length) {
    var str = '';
    for (var c = 0; c < length; c++) {
        var char = this._readUint(8);
        str += String.fromCharCode(char);
    }
    return str;
};

ISOBox.prototype._readTemplate = function (size) {
    var pre = this._readUint(size / 2);
    var post = this._readUint(size / 2);
    return pre + (post / Math.pow(2, size / 2));
};

ISOBox.prototype._readTerminatedString = function () {
    var str = '';
    while (this._cursor.offset - this._offset < this._raw.byteLength) {
        var char = this._readUint(8);
        if (char === 0) break;
        str += String.fromCharCode(char);
    }
    return str;
};

ISOBox.prototype._readData = function (size) {
    var length = (size > 0) ? size : (this._raw.byteLength - (this._cursor.offset - this._offset));
    if (length > 0) {
        var data = new Uint8Array(this._raw.buffer, this._cursor.offset, length);

        this._cursor.offset += length;
        return data;
    } else {
        return null;
    }
};

ISOBox.prototype._readUTF8String = function () {
    var length = this._raw.byteLength - (this._cursor.offset - this._offset);
    var data = null;
    if (length > 0) {
        data = new DataView(this._raw.buffer, this._cursor.offset, length);
        this._cursor.offset += length;
    }

    return data ? ISOBoxer.Utils.dataViewToString(data) : data;
};