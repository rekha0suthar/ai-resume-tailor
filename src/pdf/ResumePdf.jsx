/**
 * ResumePdf — the tailored resume as a @react-pdf/renderer Document.
 *
 * Takes the SAME parsed structure the preview renders (parseResume output —
 * single source of truth; no second markdown parse) plus a template id, and
 * mirrors the four web templates onto A4 with the standard PDF fonts.
 * Links stay clickable (<Link>), bold runs use the family's bold face,
 * bullets hang-indent, and entries never break across pages (wrap={false}).
 *
 * This module is ONLY ever loaded through a dynamic import (see
 * ResultsPanel), which keeps the whole PDF engine out of the main chunk.
 */

import React from 'react';
import { Document, Page, View, Text, Link, Font } from '@react-pdf/renderer';
import { splitInline } from '../lib/resumeParser.js';
import { resolvePdfTemplate, toWinAnsi } from './pdfStyles.js';

// Re-exported so the download flow needs a single dynamic import.
export { pdf } from '@react-pdf/renderer';

// A resume should never hyphenate "Engineering" as "Engineer-ing".
Font.registerHyphenationCallback((word) => [word]);

/** Inline **bold** spans and links, same segments the web preview renders. */
const Inline = ({ text, t, baseFont }) =>
  splitInline(text).map((seg, i) => {
    const fontFamily = seg.bold ? t.fonts.bold : baseFont || t.fonts.regular;
    if (seg.url) {
      return (
        <Link
          key={i}
          src={seg.url}
          style={{
            fontFamily,
            color: t.link.color,
            textDecoration: 'underline',
            textDecorationColor: t.link.decorationColor,
          }}
        >
          {toWinAnsi(seg.text)}
        </Link>
      );
    }
    return (
      <Text key={i} style={{ fontFamily }}>
        {toWinAnsi(seg.text)}
      </Text>
    );
  });

const BulletList = ({ items, t }) => (
  <View>
    {items.map((item, j) => (
      <View
        key={j}
        style={{ flexDirection: 'row', marginTop: j === 0 ? 0 : t.bullet.gap }}
      >
        <Text style={{ width: t.bullet.indent, color: t.bullet.markerColor }}>•</Text>
        {/* flex:1 wraps continuation lines under the text, not the marker */}
        <Text style={{ flex: 1, color: t.paragraphColor }}>
          <Inline text={item} t={t} />
        </Text>
      </View>
    ))}
  </View>
);

const Entry = ({ entry, t, first }) => (
  <View wrap={false} style={{ marginTop: first ? 0 : t.entry.marginTop }}>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text
        style={{
          flex: 1,
          paddingRight: 8,
          fontFamily: t.fonts.bold,
          fontSize: t.entry.titleSize,
          color: '#171717',
        }}
      >
        <Inline text={entry.title} t={t} baseFont={t.fonts.bold} />
      </Text>
      {entry.dates ? (
        <Text
          style={{
            fontFamily: t.entry.datesFont,
            fontSize: t.entry.datesSize,
            color: t.entry.datesColor,
            textAlign: 'right',
          }}
        >
          {toWinAnsi(entry.dates)}
        </Text>
      ) : null}
    </View>
    {entry.blocks.length > 0 && (
      <View style={{ marginTop: Math.max(2, t.blockGap - 1) }}>
        <Blocks blocks={entry.blocks} t={t} />
      </View>
    )}
  </View>
);

const Blocks = ({ blocks, t }) => (
  <View>
    {blocks.map((b, i) => {
      if (b.type === 'ul') {
        return (
          <View key={i} style={{ marginTop: i === 0 ? 0 : t.blockGap }}>
            <BulletList items={b.items} t={t} />
          </View>
        );
      }
      if (b.type === 'entry') {
        return <Entry key={i} entry={b} t={t} first={i === 0} />;
      }
      return (
        <Text
          key={i}
          style={{ marginTop: i === 0 ? 0 : t.blockGap, color: t.paragraphColor }}
        >
          <Inline text={b.text} t={t} />
        </Text>
      );
    })}
  </View>
);

const SectionHeading = ({ heading, t }) => (
  <Text
    style={{
      fontFamily: t.heading.font,
      fontSize: t.heading.fontSize,
      color: t.heading.color,
      letterSpacing: t.heading.letterSpacing,
      textTransform: 'uppercase',
      marginBottom: t.heading.marginBottom,
      ...(t.heading.rule
        ? {
            borderBottomWidth: t.heading.rule.width,
            borderBottomColor: t.heading.rule.color,
            paddingBottom: t.heading.paddingBottom,
          }
        : {}),
    }}
  >
    {toWinAnsi(heading)}
  </Text>
);

/**
 * @param {object} props
 * @param {ReturnType<import('../lib/resumeParser.js').parseResume>} props.doc
 * @param {string} props.template  one of the TEMPLATES ids
 */
const ResumePdf = ({ doc, template }) => {
  const t = resolvePdfTemplate(template);
  const hasHeader = Boolean(doc.name || doc.contact);

  return (
    <Document
      title={doc.name ? `${doc.name} - Resume` : 'Tailored Resume'}
      author={doc.name || undefined}
      creator="ai-resume-tailor"
      producer="ai-resume-tailor"
    >
      <Page
        size="A4"
        style={{
          paddingTop: t.margin.top,
          paddingRight: t.margin.right,
          paddingBottom: t.margin.bottom,
          paddingLeft: t.margin.left,
          fontFamily: t.fonts.regular,
          fontSize: t.body.fontSize,
          lineHeight: t.body.lineHeight,
          color: '#171717',
        }}
      >
        {hasHeader && (
          <View wrap={false} style={{ textAlign: t.headerAlign }}>
            {doc.name ? (
              <Text
                style={{
                  fontFamily: t.name.font,
                  fontSize: t.name.fontSize,
                  letterSpacing: t.name.letterSpacing,
                  color: t.name.color,
                  // Inherited lineHeight computes against the PAGE font size
                  // (react-pdf resolves it to an absolute at the page), which
                  // would give the big name a short line box and let the
                  // contact line overlap it — so size it explicitly here.
                  lineHeight: 1.15,
                }}
              >
                {toWinAnsi(doc.name)}
              </Text>
            ) : null}
            {doc.contact ? (
              <Text
                style={{
                  fontSize: t.contact.fontSize,
                  color: t.contact.color,
                  marginTop: t.contact.marginTop,
                  lineHeight: 1.4,
                }}
              >
                <Inline text={doc.contact} t={t} />
              </Text>
            ) : null}
          </View>
        )}

        {doc.sections.map((section, i) => (
          <View
            key={i}
            style={{
              marginTop: i === 0 && !hasHeader ? 0 : t.section.marginTop,
            }}
          >
            {section.heading ? <SectionHeading heading={section.heading} t={t} /> : null}
            <Blocks blocks={section.blocks} t={t} />
          </View>
        ))}
      </Page>
    </Document>
  );
};

export default ResumePdf;
