package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB017AllergiesAndExclusionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_017",
        title = "Allergies and Exclusions",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_016,
        onNavigate = onNavigate,
    ) {
            MFField("Allergies", "—", "Unknown allergen data is never treated as safe.")
            MFField("Other exclusions", "—")
            MFField("Foods you dislike", "—")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB017AllergiesAndExclusionsScreenPreview() {
    MoveFuelTheme { ONB017AllergiesAndExclusionsScreen {} }
}
