var blob = null;
var xhr = new XMLHttpRequest();
xhr.open("GET", "https://demo.castlabs.com/tmp/text0.mp4");
xhr.responseType = "blob";
xhr.onload = function () {
    console.log("Successfully loaded file https://demo.castlabs.com/tmp/text0.mp4");
    blob = xhr.response;
    var myReader = new FileReader();
    myReader.addEventListener("loadend", function (e) {
        var arrayBuffer = e.target.result;
        var parsedFile = ISOBoxer.parseBuffer(arrayBuffer);
        // console.log(parsedFile);

    });
    myReader.readAsArrayBuffer(blob);
}
xhr.send();

// // parsing the boxes from the arrayBuffer
// var ISOBoxer = {};
// ISOBoxer.parseBuffer = function(arrayBuffer){
//     return new ISOFile(arrayBuffer).parse();
// };
// ISOBoxer.Cursor = function (initialOffset) {
//     this.offset = ( typeof initialOffset == 'undefined' ? 0 : initialOffset);
// }

// var ISOFile = function (arrayBuffer){
//     this._cursor = new ISOBoxer.Cursor();
//     this.boxes = [];
//     if(arrayBuffer) {
//         this._raw = new DataView(arrayBuffer);
//     } 
// };
// ISOFile.prototype.parse = function(){
//     this._cursor.offset = 0;
//     this.boxes = [];
//     while (this._cursor.offset < this._raw.byteLength) {
//         var box = ISOBox.parse(this);
//         //Box could not be parsed
//         if (typeof box.type === 'undefined') break;
//         this.boxes.push(box);
//     }
//     return this;
// };

// var ISOBox = function() {
//     this._cursor = new ISOBoxer.Cursor();
// };
// ISOBox.parse = function(parent) {
//     var newBox = new ISOBox();
//     newBox._offset = parent._cursor.offset;
//     newBox._root = (parent._root ? parent._root : parent);
//     newBox._raw = parent._raw;
//     newBox._parent = parent;
//     newBox._parseBox();
//     parent._cursor.offset = newBox._raw.byteOffset + newBox._raw.byteLength;

//     if (newBox.type == 'mdat') {
//         var parser, xmlDoc, parsedXml, smtpeNameSpace, imageList;
//         xmlDoc = ISOBoxer.Utils.dataViewToString(newBox.data);
//         console.log("Content of mddat box is:" + xmlDoc);
//         parser = new DOMParser();
//         parsedXml = parser.parseFromString(xmlDoc, "text/xml");
//         smtpeNameSpace = "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt";
//         imageList = parsedXml.getElementsByTagNameNS(smtpeNameSpace, "image");
//         for (var i = 0; i < imageList.length; i++) {
//             var img = document.createElement("img");
//             var imgParent = document.getElementById('body');
//             img.id = "id" + i;
//             img.className = "smpte_image";
//             img.src = "data:image/png;base64," + imageList[i].innerHTML;
//             imgParent.appendChild(img);
//         }
//     } else {
//         console.log("Found box of type " + newBox.type + " and size " + newBox.size);
//     }

//     return newBox;
// };

// ISOBox.prototype._parseBox = function(){
//     this._parsing = true;
//     this._cursor.offset = 0;

//     //return immediately if no enough bytes to read the header
//     if(this._offset + 8 > this._raw.buffer.byteLength) {
//         this.root._incomplete = true;
//         return;
//     }

//     this._raw = new DataView(this._raw.buffer, this._offset, this.size);
// }

