package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FuelMasterDashboard(onNavigate: (MoveFuelRoute) -> Unit) {
    MFMasterScaffold(
        active = "Fuel",
        title = "Fuel",
        subtitle = "Confirmed intake · Today",
        tabs = listOf("Now", "Plan", "Shop", "Recipes"),
        selectedTab = "Now",
        onNavigate = onNavigate,
    ) {
        MFCard(Modifier.fillMaxWidth()) {
            MFSectionHeading("Nutrition", "92% coverage")
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Lg),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    MFMetricRing(.80f, "1,742", MoveFuelColors.FuelAccent, size = 118.dp)
                    Spacer(Modifier.height(MoveFuelSpacing.Sm))
                    Text("of 2,180 kcal", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
                }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm)) {
                    MFMetricRow("Protein" to "116g", "Fiber" to "24g")
                    Text("Carbs 186 / 245g", color = MoveFuelColors.TextSecondary)
                    Text("Fat 58 / 72g", color = MoveFuelColors.TextSecondary)
                }
            }
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            MFMacroBars(.80f, .80f, .76f, .81f)
        }

        MFSectionHeading("Meals", "See all")
        MFMealCard("Breakfast", "Oats · yogurt · banana · confirmed", "480 kcal", MoveFuelColors.FuelAccent)
        MFMealCard("Lunch", "Chicken rice bowl · confirmed", "675 kcal", MoveFuelColors.SageStrong)
        MFMealCard("Dinner", "Salmon bowl · planned", "610 kcal", MoveFuelColors.Info)

        MFPrimaryButton("Add food") { onNavigate(MoveFuelRoute.CAM_001) }

        MFSectionHeading("Quick add")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
            MFCard(Modifier.weight(1f)) {
                Text("Camera", style = MaterialTheme.typography.titleMedium)
                Text("Photo meal", color = MoveFuelColors.TextMuted)
            }
            MFCard(Modifier.weight(1f)) {
                Text("Barcode", style = MaterialTheme.typography.titleMedium)
                Text("Packaged food", color = MoveFuelColors.TextMuted)
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FuelMasterPreview() = MoveFuelTheme { FuelMasterDashboard {} }
