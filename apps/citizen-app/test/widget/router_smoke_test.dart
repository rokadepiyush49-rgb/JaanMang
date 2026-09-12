import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:janmaang/app.dart';
import 'package:janmaang/core/providers.dart';
import 'package:janmaang/features/auth/domain/app_user.dart';

/// Boots the real app — router, shell, bottom navigation and all — signed in.
///
/// Screens can build perfectly in isolation and still fail inside the shell,
/// so this exercises the tree the user actually gets.
void main() {
  const citizen = AppUser(
    uid: 'mock-uid',
    displayName: 'Rajesh',
    district: 'Yadgir',
    state: 'Karnataka',
    ward: 'Ward 4',
  );

  Future<void> boot(WidgetTester tester, {Size size = const Size(900, 2200)}) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authStateProvider.overrideWith(
            (ref) => Stream<AppUser?>.value(citizen),
          ),
        ],
        child: const JanMaangApp(),
      ),
    );
    await tester.pump();
    /* The app opens on a branded splash that holds for about five seconds
       before the router lands on Home. The old harness pumped one second and
       then asserted against Home's content, so these two tests were asserting
       against the splash — which is why they failed for a reason that had
       nothing to do with the router.

       Not `pumpAndSettle`: the home photo gallery drifts continuously by
       design, so the tree never reaches a settled state. */
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(seconds: 2));
    }
  }

  testWidgets('lands on Home inside the shell, with all five destinations',
      (tester) async {
    await boot(tester);

    expect(tester.takeException(), isNull);
    for (final label in <String>['Home', 'Track', 'Report', 'Ranks', 'Ledger']) {
      expect(find.text(label), findsWidgets, reason: '$label destination');
    }

    // Home's own content, not just the chrome around it.
    expect(find.text('What does your community need?'), findsOneWidget);
  });

  testWidgets('renders on a narrow phone too', (tester) async {
    await boot(tester, size: const Size(390, 2200));

    expect(tester.takeException(), isNull);
    expect(find.text('What does your community need?'), findsOneWidget);
  });
}
