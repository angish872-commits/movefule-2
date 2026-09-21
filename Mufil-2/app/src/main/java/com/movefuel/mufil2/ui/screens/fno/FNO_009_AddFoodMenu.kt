package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO009AddFoodMenuScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_009",
        title = "Add Food",
        subtitle = "Choose how to add food. Nothing is counted until you review and confirm it.",
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_001,
        onNavigate = onNavigate,
    ) {
        MFOptionCard(
            "Camera",
            "Photograph a meal, review the draft, then confirm",
            onClick = { onNavigate(MoveFuelRoute.CAM_001) },
        )
        MFOptionCard(
            "Barcode",
            "Scan packaged food and verify the serving",
            onClick = { onNavigate(MoveFuelRoute.BAR_001) },
        )
        MFOptionCard(
            "Search",
            "Find a trusted food and choose a serving",
            onClick = { onNavigate(MoveFuelRoute.FNO_010) },
        )
        MFOptionCard(
            "Recent",
            "Reuse a recently confirmed food",
            onClick = { onNavigate(MoveFuelRoute.FNO_013) },
        )
        MFOptionCard(
            "Frequent",
            "Open foods you log often",
            onClick = { onNavigate(MoveFuelRoute.FNO_014) },
        )
        MFOptionCard(
            "Favorites",
            "Open your saved favorite foods",
            onClick = { onNavigate(MoveFuelRoute.FNO_015) },
        )
        MFOptionCard(
            "Saved meals",
            "Reuse a meal you previously saved",
            onClick = { onNavigate(MoveFuelRoute.FNO_016) },
        )
        MFOptionCard(
            "Recipes",
            "Open saved recipes without marking them as eaten",
            onClick = { onNavigate(MoveFuelRoute.RCP_001) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun FNO009AddFoodMenuScreenPreview() {
    MoveFuelTheme { FNO009AddFoodMenuScreen {} }
}
