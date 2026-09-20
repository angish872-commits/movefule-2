package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB004DateOfBirthScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_004",
        title = "Date of Birth",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_003,
        onNavigate = onNavigate,
    ) {
            MFField("Date of birth", "YYYY-MM-DD", "Used for age-appropriate product behavior.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB004DateOfBirthScreenPreview() {
    MoveFuelTheme { ONB004DateOfBirthScreen {} }
}
