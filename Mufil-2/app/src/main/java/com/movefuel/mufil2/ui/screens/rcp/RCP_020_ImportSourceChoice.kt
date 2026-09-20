package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP020ImportSourceChoiceScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_020",
        title = "Import Source Choice",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_021,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_019,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("YouTube","Import from a video")
            MFOptionCard("Web","Import from a recipe page")
            MFOptionCard("Text","Paste recipe text")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP020ImportSourceChoiceScreenPreview() {
    MoveFuelTheme { RCP020ImportSourceChoiceScreen {} }
}
