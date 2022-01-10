var re_special_xmlchar = /[&"'\<\>\r\n\t ]/g;

function _encode_xmlChar(chr)
{
    if (chr == "&") return "&amp;";
    else if (chr == "'") return "&#39;";
    else if (chr == '"') return "&quot;";
    else if (chr == "<") return "&lt;";
    else if (chr == ">") return "&gt;";
    else if (chr == "\r") return "&#13;";
    else if (chr == "\n") return "&#10;";
    else if (chr == "\t") return "&#9;";
    else if (chr == " ") return "&#32;";
    else return chr;
}
function encodeXml (str)
{
    if (str !== undefined && str !== null)
        return str.replace(re_special_xmlchar, _encode_xmlChar);

    return str;
};

module.exports = encodeXml;