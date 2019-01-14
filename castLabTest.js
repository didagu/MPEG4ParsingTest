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
        File(arrayBuffer).parse();

    });
    myReader.readAsArrayBuffer(blob);
}
xhr.send();

var Utils = {};
Utils.Cursor = function(initialOffset) {
    this.offset = typeof initialOffset == 'undefined' ? 0 : initialOffset ;
}
Utils.dataViewToString = function (dataview, encoding) {
    var encoding = encoding || 'utf-8';
    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder(encoding).decode(dataView);
    }
    var a = [];
    var i = 0;

    if (encoding === 'utf-8') {
        while (i < dataView.byteLength) {
            var c = dataView.getUint8(i++);
            if (c < 0x80) {
                // 1-byte character (7 bits)
            } else if (c < 0xe0) {
                // 2-byte character (11 bits)
                c = (c & 0x1f) << 6;
                c |= (dataView.getUint8(i++) & 0x3f);
            } else if (c < 0xf0) {
                // 3-byte character (16 bits)
                c = (c & 0xf) << 12;
                c |= (dataView.getUint8(i++) & 0x3f) << 6;
                c |= (dataView.getUint8(i++) & 0x3f);
            } else {
                // 4-byte character (21 bits)
                c = (c & 0x7) << 18;
                c |= (dataView.getUint8(i++) & 0x3f) << 12;
                c |= (dataView.getUint8(i++) & 0x3f) << 6;
                c |= (dataView.getUint8(i++) & 0x3f);
            }
            a.push(String.fromCharCode(c));
        }
    } else { // Just map byte-by-byte (probably wrong)
        while (i < dataView.byteLength) {
            a.push(String.fromCharCode(dataView.getUint8(i++)));
        }
    }
    return a.join('');
}

var File = function(arrayBuffer) {
    this.cursor = new Utils.Cursor();
    if (arrayBuffer) {
        this.rawValues = new DataView(arrayBuffer);
    }
}

File.prototype.parse = function(){
    this.cursor.offset = 0;
    while(this.cursor.offset < this.rawValues.byteLength){
        Box.parse(this);
    }
}

var Box = function(){
    this.cursor = new Utils.Cursor();
}

Box.parse = function(parent){
    var tempBox = new Box();
    tempBox.offset = parent.cursor.offset;
    tempBox.rawValues = parent.rawValues;
    tempBox._parent = parent;
    tempBox.parseBox();
    parent.cursor.offset = tempBox.rawValues.byteOffset + tempBox.rawValues.byteLength;
    if (tempBox.type == 'mdat') {
        var parser, xmlDoc, parsedXml, smtpeNameSpace, imageList;
        xmlDoc = Utils.dataViewToString(tempBox.data);
        console.log("Content of mdat box is:" + xmlDoc);        
        parser = new DOMParser();
        parsedXml = parser.parseFromString(xmlDoc,"text/xml");
        smtpeNameSpace = "http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt";
        imageList = parsedXml.getElementsByTagNameNS(smtpeNameSpace, "image");
        for (var i = 0 ; i < imageList.length ; i ++ ){  
            var img = document.createElement("img");
            var imgParent = document.getElementById('body');
            img.id = "id"+i;
            img.className = "smpte_image";
            img.src = "data:image/png;base64,"+imageList[i].innerHTML;
            imgParent.appendChild(img);
        }        
    } else {
        console.log("Found box of type " + tempBox.type + " and size " + tempBox.size);
    }
}

Box.prototype.parseBox = function (){
    this.parsing = true;
    this.cursor.offset = this.offset;
    // return immediately if there are not enough bytes to read the header
    if (this.offset + 8 > this.rawValues.buffer.byteLength) {
        return;
    }

    this.processField('size','uint',32);
    this.processField('type','string',4);
}

Box.prototype.processField = function(name, type, size) {
    if(this.parsing) {
        
    }
}
