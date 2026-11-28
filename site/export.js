// Sermon prep export: turns a prepared outline into a Word document (.docx) or Markdown.
// Loaded only when someone exports, so the map does not pay for it.
// The outline: { title, subtitle, intro, sections: [{ heading, paragraphs: [{ text, link?, kind? }] }], footer }
// No Bible text is ever included: only references, links and the person's own notes.
window.bcExport = (() => {
  const xml = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Markdown ----------
  function markdown(doc) {
    const mdEsc = (s) => String(s).replace(/([\\`*_[\]#>])/g, '\\$1');
    let out = `# ${mdEsc(doc.title)}\n\n`;
    if (doc.subtitle) out += `_${mdEsc(doc.subtitle)}_\n\n`;
    if (doc.intro) out += `${mdEsc(doc.intro)}\n\n`;
    for (const s of doc.sections) {
      out += `## ${mdEsc(s.heading)}\n\n`;
      for (const p of s.paragraphs) {
        const text = p.link ? `[${mdEsc(p.text)}](${p.link})` : mdEsc(p.text);
        out += p.kind === 'label' ? `**${text}**\n\n` : p.kind === 'item' ? `- ${text}\n` : p.kind === 'quote' ? `> ${text}\n\n` : `${text}\n\n`;
      }
      out = out.replace(/(- [^\n]*\n)(?!- )/g, '$1\n');
    }
    if (doc.footer) out += `---\n\n${mdEsc(doc.footer)}\n`;
    return new Blob([out], { type: 'text/markdown;charset=utf-8' });
  }

  // ---------- Word (.docx): a small zip of XML parts, stored without compression ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    for (const [name, text] of files) {
      const data = enc.encode(text), nm = enc.encode(name), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(8, 0, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(local.buffer), nm, data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true); cen.setUint16(28, nm.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), nm);
      offset += 30 + nm.length + data.length;
    }
    const size = central.reduce((n, p) => n + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  function docx(doc) {
    const links = [];
    const run = (t, rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`;
    const para = (style, inner) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${inner}</w:p>`;
    const link = (t, url) => { links.push(url); return `<w:hyperlink r:id="rIdL${links.length}">${run(t, '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>`; };
    let body = para('Title', run(doc.title));
    if (doc.subtitle) body += para('Subtitle', run(doc.subtitle));
    if (doc.intro) body += para('', run(doc.intro));
    for (const s of doc.sections) {
      body += para('Heading1', run(s.heading));
      for (const p of s.paragraphs) {
        const inner = p.link ? link(p.text, p.link) : run(p.text, p.kind === 'label' ? '<w:b/>' : '');
        body += para(p.kind === 'item' ? 'ListParagraph' : p.kind === 'quote' ? 'Quote' : '', p.kind === 'item' ? run('•  ') + inner : inner);
      }
    }
    if (doc.footer) body += para('Footer', run(doc.footer));
    const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    const style = (id, name, ppr, rpr, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${extra}<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
${style('Title', 'Title', '<w:spacing w:after="60"/>', '<w:b/><w:sz w:val="44"/>')}
${style('Subtitle', 'Subtitle', '<w:spacing w:after="240"/>', '<w:color w:val="666666"/><w:sz w:val="24"/>')}
${style('Heading1', 'heading 1', '<w:keepNext/><w:spacing w:before="320" w:after="80"/><w:outlineLvl w:val="0"/>', '<w:b/><w:color w:val="0E7C72"/><w:sz w:val="30"/>')}
${style('ListParagraph', 'List Paragraph', '<w:ind w:left="360"/><w:spacing w:after="40"/>', '')}
${style('Quote', 'Quote', '<w:ind w:left="360"/>', '<w:i/><w:color w:val="444444"/>')}
${style('Footer', 'Footer text', '<w:spacing w:before="480"/>', '<w:color w:val="777777"/><w:sz w:val="18"/>')}
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0B6E66"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`;
    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${links.map((u, n) => `<Relationship Id="rIdL${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(u)}" TargetMode="External"/>`).join('')}</Relationships>`;
    return zip([
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ['word/document.xml', document],
      ['word/styles.xml', styles],
      ['word/_rels/document.xml.rels', rels],
    ]);
  }
  return { markdown, docx };
})();
