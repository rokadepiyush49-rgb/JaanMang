import { describe, expect, it } from 'vitest';
import { AppConfigService } from '../../../src/config/app-config.service';
import { IntakeAiService, canonicalTerms } from '../../../src/reports/intake-ai.service';

/** The service with no Groq key — the path a fresh clone and every test takes. */
const intake = new IntakeAiService({ groqApiKey: undefined } as AppConfigService);

describe('the keyword pass is a real classifier, not a stub', () => {
  it('classifies English reports', () => {
    expect(
      intake.keywordRead('The handpump near the school has been dry for six days').category,
    ).toBe('water');
    expect(
      intake.keywordRead('Street light pole by the market is dead, dark since Tuesday').category,
    ).toBe('streetlight');
    expect(
      intake.keywordRead('Garbage has not been collected in our ward for nine days').category,
    ).toBe('waste');
  });

  it('classifies Hindi in Devanagari', () => {
    expect(intake.keywordRead('चापाकल सूखा है, पानी नहीं आ रहा').category).toBe('water');
    expect(intake.keywordRead('सड़क पर बड़ा गड्ढा है').category).toBe('roads');
  });

  it('classifies Hindi typed in Latin script, which is how most of them arrive', () => {
    // The case that was silently wrong: with only Devanagari in the table this
    // scored zero on water and was filed under `school`, because the writer
    // mentioned the school the handpump stands next to.
    expect(
      intake.keywordRead('School ke paas wala chapakal sukha pada hai, paani nahi aa raha')
        .category,
    ).toBe('water');
    expect(intake.keywordRead('Sadak par bada gaddha ho gaya hai').category).toBe('roads');
    expect(intake.keywordRead('Naali ka pani ghar mein aa raha hai').category).toBe('drainage');
  });

  it('lets the reporter overrule the keywords about their own problem', () => {
    const read = intake.keywordRead('It has been like this for weeks', { category: 'bridge' });
    expect(read.category).toBe('bridge');
    // But a dropdown nobody changed is not certainty.
    expect(read.confidence).toBeLessThan(0.8);
  });

  it('is unsure when the text says nothing identifiable', () => {
    const read = intake.keywordRead('Something has been wrong here for a long while now');
    expect(read.confidence).toBeLessThan(0.55);
  });

  it('is confident when the text is unambiguous', () => {
    const read = intake.keywordRead('Handpump is dry, no water, chapakal kharab');
    expect(read.confidence).toBeGreaterThan(0.6);
  });

  it('raises severity on words that describe consequence', () => {
    expect(
      intake.keywordRead('Handpump dry, children are falling sick from the pond water').severity,
    ).toBe('high');
    expect(intake.keywordRead('The culvert collapsed and a man died').severity).toBe('critical');
  });

  it("titles the problem in the reporter's own words", () => {
    const read = intake.keywordRead(
      'Handpump near the school has been dry for six days. We walk 2 km.',
    );
    expect(read.title).toBe('Handpump near the school has been dry for six days');
  });

  it('says which pass read it, every time', () => {
    expect(intake.keywordRead('Handpump dry').source).toBe('keywords');
    expect(intake.usingModel).toBe(false);
  });
});

describe('canonical terms bridge the scripts', () => {
  it('collapses the same thing written three ways', () => {
    expect(canonicalTerms('the handpump is dry')).toEqual(new Set(['handpump', 'dry']));
    expect(canonicalTerms('chapakal sukha hai')).toEqual(new Set(['handpump', 'dry']));
    expect(canonicalTerms('चापाकल सूखा है')).toEqual(new Set(['handpump', 'dry']));
  });

  it('is what lets an English and a Hinglish report recognise each other', () => {
    const english = canonicalTerms('The handpump near the school has been dry, no water');
    const hinglish = canonicalTerms(
      'School ke paas wala chapakal sukha pada hai, paani nahi aa raha',
    );
    const shared = [...english].filter((t) => hinglish.has(t));
    expect(shared.sort()).toEqual(['dry', 'handpump', 'school', 'water']);
  });

  it('finds nothing in text about nothing', () => {
    expect(canonicalTerms('something is wrong here')).toEqual(new Set());
  });
});
