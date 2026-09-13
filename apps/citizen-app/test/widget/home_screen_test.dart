import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:janmaang/features/home/presentation/home_screen.dart';

/// Home lays out differently either side of the 768px breakpoint, and the wide
/// path once crashed because it asked a shrink-wrapped viewport for its
/// intrinsic height. Both widths are exercised so that cannot regress.
///
/// These assertions anchor on the call to action rather than on the marketing
/// headline. The headline is the line most likely to be rewritten — it already
/// was, from "Make your community heard." to the current copy, which is what
/// left these five tests red — and a test that breaks every time somebody
/// edits a sentence teaches people to ignore the suite.
void main() {
  Future<void> pumpHome(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: HomeScreen())),
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 2));
  }

  testWidgets('builds on a narrow phone layout', (tester) async {
    await pumpHome(tester, const Size(390, 2400));

    expect(tester.takeException(), isNull);
    expect(find.text('What does your community need?'), findsOneWidget);
  });

  testWidgets('builds on a wide tablet layout', (tester) async {
    await pumpHome(tester, const Size(1100, 2400));

    expect(tester.takeException(), isNull);
    expect(find.text('What does your community need?'), findsOneWidget);
  });

  testWidgets('shows the community pulse figures once loaded', (tester) async {
    await pumpHome(tester, const Size(390, 2400));
    // Not pumpAndSettle: the photo gallery drifts continuously by design, so
    // the tree never reaches a settled state.
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Community pulse'), findsOneWidget);
    expect(find.text('Active demands'), findsOneWidget);
    expect(find.text('People affected'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
