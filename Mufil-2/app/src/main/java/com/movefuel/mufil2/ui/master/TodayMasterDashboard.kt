package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TodayMasterDashboard(onNavigate: (MoveFuelRoute) -> Unit) {
    MFMasterScaffold(
        active = "Today",
        title = "Today",
        subtitle = "Saturday · September 19",
        onNavigate = onNavigate,
    ) {
        Text("Good evening", style = MaterialTheme.typography.titleMedium, color = MoveFuelColors.TextSecondary)

        MFCard(Modifier.fillMaxWidth()) {
            MFSectionHeading("Daily status", "More nutrition")
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm)) {
                    MFMetricRing(.80f, "1,742")
                    Text("Energy", color = MoveFuelColors.TextSecondary, style = MaterialTheme.typography.labelMedium)
                    Text("of 2,180", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm)) {
                    MFMetricRing(.80f, "116g", MoveFuelColors.SageStrong)
                    Text("Protein", color = MoveFuelColors.TextSecondary, style = MaterialTheme.typography.labelMedium)
                    Text("of 145g", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm)) {
                    MFMetricRing(.63f, "38m", MoveFuelColors.Info)
                    Text("Movement", color = MoveFuelColors.TextSecondary, style = MaterialTheme.typography.labelMedium)
                    Text("of 60m", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        MFNextActionCard(
            title = "Review your planned lunch",
            supporting = "One clear priority keeps the dashboard useful instead of noisy.",
        )

        MFSectionHeading("Connected device")
        MFDeviceCard("Pixel Watch", "Synced recently · workout ready")

        MFSectionHeading("Today's workout", "View Train")
        MFWorkoutHero(
            title = "Upper Strength A",
            meta = "46 min · 5 exercises · readiness reduced",
            onStart = { onNavigate(MoveFuelRoute.WRK_001) },
        )

        MFSectionHeading("Today's meals", "View Fuel")
        MFMealCard("Breakfast", "Oats · yogurt · banana · confirmed", "480 kcal", MoveFuelColors.FuelAccent)
        MFMealCard("Lunch", "Chicken rice bowl · planned", "610 kcal", MoveFuelColors.SageStrong)
        MFMealCard("Snack", "Apple · yogurt · confirmed", "220 kcal", MoveFuelColors.Info)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TodayMasterPreview() = MoveFuelTheme { TodayMasterDashboard {} }
