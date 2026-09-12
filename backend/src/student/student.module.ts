import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentCollabService } from './student-collab.service';
import { HeuristicRecommender } from './recommendation/heuristic.recommender';
import { ModelRecommender } from './recommendation/model.recommender';
import { RECOMMENDATION_SERVICE } from './recommendation/recommendation.types';

/**
 * The student workspace.
 *
 * `RECOMMENDATION_SERVICE` always resolves to `ModelRecommender`, which is not
 * the same as always calling a model: that class reads `RECOMMENDER_URL` and
 * delegates to the heuristic when none is set, when the call fails, or when the
 * answer is unusable. Binding it here rather than choosing at wiring time means
 * the fallback is a property of the adapter — so an operator setting the URL at
 * runtime changes behaviour without a redeploy, and a model that starts failing
 * degrades instead of taking the workspace down.
 */
@Module({
  controllers: [StudentController],
  providers: [
    StudentService,
    StudentCollabService,
    HeuristicRecommender,
    { provide: RECOMMENDATION_SERVICE, useClass: ModelRecommender },
  ],
  exports: [HeuristicRecommender],
})
export class StudentModule {}
